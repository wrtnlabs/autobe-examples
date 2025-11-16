import { tags } from "typia";

export namespace IShoppingMallUser {
  /**
   * Summary view of a shopping mall user account containing key
   * identification and status fields for listing purposes.
   */
  export type ISummary = {
    /** Unique identifier for the user */
    id: string & tags.Format<"uuid">;

    /** Username chosen by the user */
    username: string;

    /** Email address associated with the user account */
    email: string;

    /** Active status of the user account */
    status: string;

    /** Account creation date in ISO 8601 format */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp of the user's last login */
    last_login_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * User role within the shopping mall system, indicating permission
     * level
     */
    role?: string | undefined;
  };
}
