import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListUser {
  /**
   * Authorization response containing JWT token information for the Todo List
   * application. Return type for join, login, and refresh operations.
   *
   * This schema defines the standard structure returned by authentication
   * operations (POST /auth/user/join, POST /auth/user/login, POST
   * /auth/user/refresh).
   *
   * Following the standard pattern for authentication responses, this schema
   * contains two properties:
   *
   * - Id: unique identifier of the authenticated user
   * - Token: JWT token object with access and refresh tokens
   *
   * The id field references the todo_list_user entity in the Prisma schema
   * through the x-autobe-prisma-schema field, establishing a clear link
   * between the authorization response and the database entity.
   *
   * Since this is a single-user system with no authentication credentials,
   * the id field serves as the sole identifier for the user's task data, and
   * the token object provides session management through JWT.
   *
   * The adherence to the I{RoleName}.IAuthorized naming convention is
   * maintained, as this represents the authorized representation of the user
   * (IUser → ITodoListUser: "User" is the role).
   *
   * The token property references the default IAuthorizationToken type
   * provided by the system, ensuring consistency across all authentication
   * responses.
   *
   * The description provides complete business context about the
   * authentication model, explaining why this structure is appropriate for a
   * device-bound, single-user application without traditional credentials.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user.
     *
     * This field corresponds to the id column in the todo_list_user Prisma
     * model, which serves as the primary key for the single user account
     * managed by the system.
     *
     * The system uses this identifier to establish a persistent
     * device-bound identity without requiring any external authentication
     * mechanism.
     *
     * Despite the system having no email, password, or username fields in
     * the database, the JWT token includes this user ID to allow the client
     * to tie operations back to the correct task set.
     *
     * This field is mandatory in all authorization response types and
     * matches the exact identifier used in the todo_list_user table.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Related Prisma schema.
     *
     * This field links the OpenAPI schema to the corresponding Prisma model
     * for automated validation.
     *
     * The value "todo_list_user" exactly matches the model name in the
     * Prisma schema.
     *
     * When present, this field enables validation that all properties in
     * this schema exist in the referenced Prisma model.
     *
     * This facilitates automatic code generation and ensures interface
     * consistency with the database structure.
     *
     * This field is optional and appears on all variant schemas that
     * directly correspond to a Prisma model (ITodoListUser.IAuthorized).
     */
    "x-autobe-prisma-schema"?: "todo_list_user" | undefined;
  };
}
