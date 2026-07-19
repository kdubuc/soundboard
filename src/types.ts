export interface SoundConfig {
  title : string;
  data_key ?: string;
  sound : string;
  looped ?: boolean;
  interrupt ?: boolean;
}

export interface SoundboardConfig {
  _name ?: string;
  _description ?: string;
  _websocket_url ?: string;
  sections : { [key: string]: SoundConfig[] };
}
