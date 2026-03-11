import { tags } from "typia";

export namespace IEcommerceMallAdminGradeRequest {
  /**
   * Request body for promoting an administrator to super administrator grade. Specifies the target administrator's unique identifier to be promoted.
   */
  export type IPromote = {
    /**
     * Unique identifier of the administrator to be promoted to super administrator grade.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping to ecommerce_mall_admins.id. Required UUID of the administrator to be promoted to super grade. Target must be a regular administrator (not already super) and cannot be the requesting user (self-promotion prevention). The system validates the target admin exists and has 'regular' grade before proceeding.
     */
    targetAdministratorId: string & tags.Format<"uuid">;
  };
}
