import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdate;
}): Promise<IHrmPlatformRole> {
  await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: { id: props.roleId, deleted_at: null },
    ...HrmPlatformRoleTransformer.select(),
  });
  if (role.role_kind !== "custom") {
    throw new HttpException("Cannot modify built-in role permissions", 400);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: role.organization.id,
      },
      select: {
        hrm_platform_role_id: true,
      },
    });
  const employeeRole =
    await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
      where: { id: employee.hrm_platform_role_id, deleted_at: null },
      select: { permissions: true },
    });
  const hasManagePermission = employeeRole.permissions.some(
    (perm: { code: string }) => perm.code === "employee:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("You do not have permission to modify roles", 403);
  }
  const permissionCodes = props.body.permissions;
  if (permissionCodes === undefined || permissionCodes.length === 0) {
    throw new HttpException("Permission codes array is required", 400);
  }
  if (permissionCodes.length !== new Set(permissionCodes).size) {
    throw new HttpException("Permission codes must be unique", 400);
  }
  const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: {
      code: { in: permissionCodes },
      organization_id: role.organization.id,
      deleted_at: null,
    },
  });
  if (permissions.length !== permissionCodes.length) {
    throw new HttpException("Some permission codes do not exist", 400);
  }
  await MyGlobal.prisma.hrm_platform_permissions.deleteMany({
    where: {
      role_id: props.roleId,
      deleted_at: null,
    },
  });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrm_platform_permissions.createMany({
    data: permissions.map((p) => ({
      id: v4(),
      role_id: props.roleId,
      organization_id: role.organization.id,
      code: p.code,
      description: p.description ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })),
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: role.organization.id,
      entity_type: "role",
      entity_id: props.roleId,
      action_type: "update",
      action_name: "update_role_permissions",
      extra_data: JSON.stringify({ permission_count: permissionCodes.length }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const updatedRole = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow(
    {
      where: { id: props.roleId, deleted_at: null },
      ...HrmPlatformRoleTransformer.select(),
    },
  );
  return await HrmPlatformRoleTransformer.transform(updatedRole);
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
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberRolesRoleIdPermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmPlatformRole.IUpdate;
// }): Promise<IHrmPlatformRole> {
//   const record = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
//     ...HrmPlatformRoleTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------