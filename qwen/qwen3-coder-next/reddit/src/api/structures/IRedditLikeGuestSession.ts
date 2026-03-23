import { tags } from "typia";

export namespace IRedditLikeGuestSession {
  /**
   * Query parameters for searching and filtering authentication sessions. Allows moderators to filter sessions by status, time range, IP address, and pagination controls.
   */
  export type IRequest = {
    /**
     * Filter sessions by authentication state.
     *
     * @x-autobe-specification Filter by session state. One of: 'active', 'expired', 'revoked'.
     */
    status?: "active" | "expired" | "revoked" | undefined;

    /**
     * Sessions created after this timestamp.
     *
     * @x-autobe-specification Filter sessions created after this timestamp.
     */
    createdAtStart?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sessions created before this timestamp.
     *
     * @x-autobe-specification Filter sessions created before this timestamp.
     */
    createdAtEnd?: (string & tags.Format<"date-time">) | undefined;

    /**
     * IP address to filter sessions.
     *
     * @x-autobe-specification Filter by IP address (exact match).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Current page number to retrieve.
     *
     * @x-autobe-specification Page number (1-indexed). Defaults to 1.
     */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Maximum number of records per page.
     *
     * @x-autobe-specification Records per page. Defaults to 20, maximum 100.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;
  };
}
