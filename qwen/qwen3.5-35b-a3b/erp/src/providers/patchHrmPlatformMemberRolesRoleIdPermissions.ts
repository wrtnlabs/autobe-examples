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
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
    });
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: session.organization_id ?? "" },
    });
  const memberRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: organization.id,
      employees: {
        some: {
          employee_code: session.hrm_platform_member_id,
          deleted_at: null,
        },
      },
      deleted_at: null,
    },
  });
  if (memberRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        role_id: memberRole.id,
        code: "employee:manage",
        organization_id: organization.id,
        deleted_at: null,
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      organization_id: organization.id,
      deleted_at: null,
      role_kind: "custom",
    },
  });
  const permissionCodes: string[] = props.body.permissions ?? [];
  if (permissionCodes.length === 0) {
    throw new HttpException("Permissions array cannot be empty", 400);
  }
  const validPermissions =
    await MyGlobal.prisma.hrm_platform_permissions.findMany({
      where: {
        code: {
          in: permissionCodes,
        },
        organization_id: organization.id,
        deleted_at: null,
      },
    });
  if (validPermissions.length !== permissionCodes.length) {
    throw new HttpException("Some permission codes are invalid", 400);
  }
  await MyGlobal.prisma.hrm_platform_permissions.deleteMany({
    where: {
      role_id: props.roleId,
    },
  });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  for (const code of permissionCodes) {
    const permissionId: string & tags.Format<"uuid"> = v4();
    await MyGlobal.prisma.hrm_platform_permissions.create({
      data: {
        id: permissionId,
        role_id: props.roleId,
        organization_id: organization.id,
        code: code,
        created_at: now,
        updated_at: now,
      },
    });
  }
  const updatedRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
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