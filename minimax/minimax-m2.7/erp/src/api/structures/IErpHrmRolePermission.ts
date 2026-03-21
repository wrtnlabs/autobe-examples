import { tags } from "typia";

import { IErpHrmRole } from "./IErpHrmRole";

export namespace IErpHrmRolePermission {
  /**
   * Summary representation of a role-permission assignment for listing operations. Contains the permission code and the associated role this permission belongs to.
   */
  export type ISummary = {
    /**
     * Unique identifier for the role-permission assignment.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from erp_hrm_role_permissions.id UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Permission code string defining access rights (e.g., 'org:manage', 'time:approve').
     *
     * @x-autobe-database-schema-property permission
     * @x-autobe-specification Direct mapping from erp_hrm_role_permissions.permission string. Permission codes follow pattern '{resource}:{action}' such as 'org:manage', 'employee:manage', 'project:view'.
     */
    permission: string;

    /**
     * The role this permission belongs to.
     *
     * @x-autobe-database-schema-property role
     * @x-autobe-specification BELONGS-TO relation: erp_hrm_role_permissions.role → erp_hrm_roles via erp_hrm_role_id FK. Returns IErpHrmRole.ISummary object with role name and organization context.
     */
    role: IErpHrmRole.ISummary;
  };
}
