import { tags } from "typia";

export namespace IErpHrmMemberPasswordReset {
  /**
   * Request body for initiating a password reset. Contains the email address of the account that needs password recovery. If an account exists with the provided email, a password reset link will be sent to that email address. The response does not indicate whether the email is registered to prevent email enumeration attacks.
   */
  export type IRequest = {
    /**
     * The email address of the member account requesting a password reset. Must be a valid email format.
     *
         * @x-autobe-specification Email address used to lookup member in
         *   erp_hrm_members.email column. If member exists, a password reset
         *   token is created in erp_hrm_member_password_resets table.
     */
    email: string & tags.Format<"email">;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
         * @x-autobe-specification 1-indexed page number. Defaults to 1 if not
         *   provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls how many records are included in each page response. If omitted,
     * null, or undefined, defaults to 100 records per page. The server may
     * enforce upper bounds to prevent excessive resource consumption on large
     * requests.
     *
         * @x-autobe-specification Maximum records per page. Defaults to 100 if
         *   not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
