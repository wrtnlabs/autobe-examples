import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date().toISOString();
  // 1. Retrieve the role
  const role = await MyGlobal.prisma.hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_organization_id: true,
      is_builtin: true,
    },
  });
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  // 2. Verify not built-in role
  if (role.is_builtin) {
    throw new HttpException("Cannot modify built-in roles", 403);
  }
  // 3. Verify role-permission assignment exists
  const rolePermission = await MyGlobal.prisma.hrm_role_permissions.findUnique({
    where: {
      hrm_role_id_hrm_permission_id: {
        hrm_role_id: props.roleId,
        hrm_permission_id: props.permissionId,
      },
    },
  });
  if (rolePermission === null) {
    throw new HttpException("Role-permission assignment not found", 404);
  }
  // 4. Count remaining permissions after deletion
  const remainingCount = await MyGlobal.prisma.hrm_role_permissions.count({
    where: {
      hrm_role_id: props.roleId,
      NOT: {
        hrm_permission_id: props.permissionId,
      },
    },
  });
  if (remainingCount === 0) {
    throw new HttpException("Role must have at least one permission", 400);
  }
  // 5. Delete the role-permission record
  await MyGlobal.prisma.hrm_role_permissions.delete({
    where: {
      hrm_role_id_hrm_permission_id: {
        hrm_role_id: props.roleId,
        hrm_permission_id: props.permissionId,
      },
    },
  });
  // 6. Log the permission removal in activity logs
  await MyGlobal.prisma.hrm_activity_logs.create({
    data: {
      id: v4(),
      hrm_members_id: props.member.id,
      timestamp: now,
      action_type: "role_permission_removed",
      target_entity_type: "Role",
      target_entity_id: props.roleId,
      details: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmMemberRolesRoleIdPermissionsPermissionId(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   permissionId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------