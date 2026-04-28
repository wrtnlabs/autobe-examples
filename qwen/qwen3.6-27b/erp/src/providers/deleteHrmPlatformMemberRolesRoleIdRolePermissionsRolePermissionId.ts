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

export async function deleteHrmPlatformMemberRolesRoleIdRolePermissionsRolePermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  rolePermissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const rolePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findUniqueOrThrow({
      where: {
        id: props.rolePermissionId,
      },
      select: {
        id: true,
        hrm_platform_role_id: true,
        role: {
          select: {
            id: true,
            name: true,
            built_in: true,
            hrm_platform_organization_id: true,
            _count: {
              select: {
                employees: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
            },
          },
        },
      },
    });
  if (rolePermission.hrm_platform_role_id !== props.roleId) {
    throw new HttpException(
      "Role permission not found for the specified role",
      404,
    );
  }
  if (rolePermission.role.built_in) {
    throw new HttpException("Cannot modify permissions of built-in roles", 403);
  }
  if (rolePermission.role._count.employees > 0) {
    throw new HttpException(
      "Cannot remove permissions from roles with active employee assignments",
      409,
    );
  }
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id:
          rolePermission.role.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_role_permissions.delete({
    where: {
      id: props.rolePermissionId,
    },
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id:
        rolePermission.role.hrm_platform_organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "role_permission_removed",
      entity_type: "role",
      entity_id: rolePermission.role.id,
      entity_name: rolePermission.role.name,
      created_at: new Date(),
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
// export async function deleteHrmPlatformMemberRolesRoleIdRolePermissionsRolePermissionId(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   rolePermissionId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------