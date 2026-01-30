import { tags } from "typia";

export namespace IEconomicForumAdminPasswordReset {
  /**
   * Email address of the admin user requesting a password reset. Used to
   * initiate the password reset sequence without revealing whether the email
   * exists in the system, preventing email enumeration attacks.
   */
  export type IRequest = {
    /**
     * The registered email address of the admin user who is requesting a
     * password reset. This email is used to identify the admin account in
     * the database without exposing whether the account exists, protecting
     * against enumeration attacks.
     *
     * @x-autobe-database-schema-property economic_forum_admin_id
     * @x-autobe-specification The email address provided in this request is used as a lookup key to find the corresponding admin in the economic_forum_admins table. The matching admin record's economic_forum_admin_id is then used as the foreign key in the economic_forum_admin_password_resets table. The email value is not stored directly in economic_forum_admin_password_resets but serves as the input to establish the relationship between the request and the admin account via the economic_forum_admin_id field.
     */
    email: string & tags.Format<"email">;
  };
}
