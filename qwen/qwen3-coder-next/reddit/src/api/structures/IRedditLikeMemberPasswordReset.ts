import { tags } from "typia";

export namespace IRedditLikeMemberPasswordReset {
  /**
   * Request payload for initiating password reset for a member account.
   */
  export type IRequest = {
    /**
     * Member's email address for password reset request.
     *
     * @x-autobe-specification User's email address. Must be a valid email format. Used to identify the member account requesting password reset. Server will validate format and look up member by email.
     */
    email: string & tags.Format<"email">;

    /**
     * Target page number to retrieve (1-indexed). Defaults to 1 if not provided.
     *
     * @x-autobe-specification Optional pagination parameter specifying target page number (1-indexed). Defaults to 1 if not provided, null, or undefined. Requesting a page beyond the available range returns an empty data array with valid pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Defaults to 100 if not provided.
     *
     * @x-autobe-specification Optional pagination parameter specifying maximum number of records to return per page. Defaults to 100 if not provided, null, or undefined. Server may enforce upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Password reset request confirmation response.
   */
  export type IResponse = {
    /**
     * Confirmation message indicating password reset request was processed.
     *
     * @x-autobe-specification Confirmation message indicating password reset request was processed.
     */
    message: string;
  };
}
