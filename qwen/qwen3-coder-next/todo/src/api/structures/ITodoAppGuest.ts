import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Request body for guest account registration with device identification and session metadata.
   */
  export type IJoin = {
    /**
     * Unique identifier for the guest's device/browser session.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from todo_app_guests.device_id. UUID format for device identification.
     */
    device_id: string & tags.Format<"uuid">;

    /**
     * IP address of the guest at session creation.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from todo_app_guests.ip. IP address captured at session creation.
     */
    ip: string;

    /**
     * Browser user agent string for device identification.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from todo_app_guests.user_agent. Optional browser user agent string for device identification.
     */
    user_agent?: string | null | undefined;
  };

  /**
   * Request body for guest session refresh containing the device identifier.
   */
  export type IRefresh = {
    /**
     * Unique identifier for the guest's device/browser session used to locate the active guest session for token renewal.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from todo_app_guests.device_id. Used to locate active guest session.
     */
    device_id: string & tags.Format<"uuid">;
  };

  /**
   * Guest authentication response containing authorization tokens and minimal guest identification information.
   */
  export type IAuthorized = {
    /**
     * Guest identification information including unique ID and device identifier.
     *
     * @x-autobe-specification Guest identity information from todo_app_guests table. Contains id (primary key) and device_id (unique session identifier).
     */
    guest: {
      id: string & tags.Format<"uuid">;
      device_id: string;
    };

    /**
     * Authentication tokens including access token, refresh token, and expiration information.
     *
     * @x-autobe-specification Authentication tokens from guest session table. Contains access token (JWT), refresh token, and expiration timestamp.
     */
    authorization: {
      access: string;
      refresh: string;
      expired_at: string & tags.Format<"date-time">;
    };

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
