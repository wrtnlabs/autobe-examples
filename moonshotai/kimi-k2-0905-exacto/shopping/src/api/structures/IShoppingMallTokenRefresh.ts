import { tags } from "typia";

export namespace IShoppingMallTokenRefresh {
  /**
   * Request payload for token refresh operations, containing the existing
   * refresh token and optional device security information to validate the
   * session and issue fresh authentication tokens in the shopping mall
   * platform.
   */
  export type ICreate = {
    /**
     * Current valid refresh token used to request new access and refresh
     * tokens. Must be a previously issued token from a successful
     * authentication operation such as login, registration, or previous
     * token refresh event.
     */
    refresh_token: string & tags.MinLength<1>;

    /**
     * Optional device identification fingerprint for enhanced security
     * validation during token refresh. Used to detect unauthorized device
     * changes that might indicate token theft or session compromise.
     */
    device_fingerprint?: (string & tags.MinLength<1>) | null | undefined;

    /**
     * Optional client user agent string providing browser, device, or
     * application identification information for security analysis and
     * session tracking purposes.
     */
    user_agent?: (string & tags.MinLength<1>) | null | undefined;
  };
}
