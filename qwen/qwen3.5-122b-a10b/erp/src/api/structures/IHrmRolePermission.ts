import { tags } from "typia";

export namespace IHrmRolePermission {
  /**
   * Request body for assigning permissions to a role within an organization.
   *
   * This DTO represents the payload for the role permission assignment endpoint. It contains an array of permission identifiers that will be linked to the specified role through the hrm_role_permissions junction table. The target role is identified by the roleId path parameter, not by any field in this request body.
   *
   * **Usage Context**
   *
   * Send this request to POST /hrm/member/roles/{roleId}/permissions where:
   * - The {roleId} path parameter identifies the target role
   * - The permission_ids array specifies which permissions to grant to that role
   *
   * **Validation Rules**
   *
   * - The permission_ids array must contain at least one element (minItems: 1)
   * - Each permission_id must be a valid UUID format
   * - Each permission_id must reference an existing record in the hrm_permissions table
   * - The target role must exist and belong to the current organization context
   * - The target role must not be a built-in role (built-in roles have immutable permissions)
   * - The requesting user must have org:manage permission for the organization
   *
   * **Business Constraints**
   *
   * - Duplicate permission IDs in the array are handled gracefully by the database unique constraint
   * - Each valid permission_id creates one record in hrm_role_permissions
   * - Built-in roles (Owner, Manager, Employee) cannot have their permissions modified
   * - Custom roles must have at least one permission assigned (enforced at role creation)
   */
  export type IAssign = {
    /**
     * Array of permission identifiers to assign to a role within an organization.
     *
     * This property contains the permission UUIDs that will be linked to the specified role (identified by the roleId path parameter) through the hrm_role_permissions junction table. Each permission must exist in the system permission catalog (hrm_permissions table) and will be validated before assignment.
     *
     * **Validation Rules**
     *
     * - Array must contain at least one permission ID (minItems: 1)
     * - Each permission_id must be a valid UUID format
     * - Each permission_id must reference an existing record in hrm_permissions
     * - Duplicate permission IDs are handled gracefully by the unique constraint on (hrm_role_id, hrm_permission_id)
     *
     * **Business Context**
     *
     * - Built-in roles cannot have their permissions modified (returns 403 Forbidden)
     * - User must have org:manage permission for the organization
     * - Role must belong to the current organization context
     * - Each permission assignment creates a separate record in hrm_role_permissions
     *
     * **Usage Example**
     *
     * ```json
     * {
     *   "permission_ids": [
     *     "550e8400-e29b-41d4-a716-446655440000",
     *     "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
     *   ]
     * }
     * ```
     *
         * @x-autobe-specification Array of permission UUIDs to assign to the
         *   role. Each permission_id is validated against hrm_permissions table
         *   for existence before insertion. The backend creates one
         *   hrm_role_permissions record per permission_id, using the
         *   hrm_role_id from the path parameter {roleId}. Duplicate permission
         *   IDs are handled by the unique constraint on (hrm_role_id,
         *   hrm_permission_id). The roleId itself is NOT included in this
         *   request body - it comes from the URL path.
     */
    permission_ids: (string & tags.Format<"uuid">)[] & tags.MinItems<1>;
  };
}
