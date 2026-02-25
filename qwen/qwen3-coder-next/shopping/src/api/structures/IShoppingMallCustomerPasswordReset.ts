import { tags } from "typia";

export namespace IShoppingMallCustomerPasswordReset {
  /**
   * Password reset request body containing the reset token and new password for customer account recovery.
   */
  export type IRequest = {
    /**
     * Hashed password reset token value received from the customer's password reset link or request.
     *
     * @x-autobe-database-schema-property token_hash
     * @x-autobe-specification Direct mapping from password_resets.token_hash. Used to locate pending password reset record.
     */
    token_hash: string & tags.MinLength<1>;

    /**
     * New password for the customer account. Must meet security requirements (minimum 8 characters).
     *
     * @x-autobe-specification Password validation: minimum 8 characters. Backend hashes plain-text password to customer.password_hash using bcrypt cost factor 12.
     */
    new_password: string & tags.MinLength<8> & tags.Format<"password">;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number. Defaults to 1 if not provided. Used for pagination query logic.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 100 if not provided. Used for pagination query logic.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
