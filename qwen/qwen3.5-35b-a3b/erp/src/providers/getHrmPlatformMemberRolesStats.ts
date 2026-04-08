import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPlatformRoleStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformRoleStat";
import { IRoleStatItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleStatItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RoleStatItemTransformer } from "../transformers/RoleStatItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberRolesStats(props: {
  member: MemberPayload;
}): Promise<IPlatformRoleStat> {
  // Get organization context from session
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_member_id: props.member.id,
    },
    select: { organization: { select: { id: true } } },
  });
  if (!session || !session.organization) {
    throw new HttpException("Organization context not found", 404);
  }
  const organizationId = session.organization.id;
  // Get all roles with employee counts
  const allRoles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: {
      organization_id: organizationId,
      deleted_at: null,
    },
    ...RoleStatItemTransformer.select(),
  });
  // Transform roles to IRoleStatItem
  const employeeDistribution = await ArrayUtil.asyncMap(
    allRoles,
    async (role) => await RoleStatItemTransformer.transform(role),
  );
  // Count role statistics
  const totalRoles = await MyGlobal.prisma.hrm_platform_roles.count({
    where: {
      organization_id: organizationId,
      deleted_at: null,
    },
  });
  const builtInRoles = await MyGlobal.prisma.hrm_platform_roles.count({
    where: {
      organization_id: organizationId,
      deleted_at: null,
      role_kind: "built_in",
    },
  });
  const customRoles = await MyGlobal.prisma.hrm_platform_roles.count({
    where: {
      organization_id: organizationId,
      deleted_at: null,
      role_kind: "custom",
    },
  });
  // Get permission statistics
  const totalPermissions = await MyGlobal.prisma.hrm_platform_permissions.count(
    {
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
    },
  );
  const uniquePermissionCodes = await MyGlobal.prisma.hrm_platform_permissions
    .groupBy({
      by: ["code"],
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      _count: {
        code: true,
      },
    })
    .then((result) => result.length);
  return {
    roleStats: {
      total: totalRoles,
      builtIn: builtInRoles,
      custom: customRoles,
    },
    employeeDistribution: employeeDistribution as any,
    permissionStats: {
      total_permissions: totalPermissions,
      unique_permission_codes: uniquePermissionCodes,
    },
  } satisfies IPlatformRoleStat;
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
// import { IPlatformRoleStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformRoleStat";
// import { IRoleStatItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleStatItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberRolesStats(props: {
//   member: MemberPayload;
// }): Promise<IPlatformRoleStat> {
//   return {
//     roleStats: ...,
//     employeeDistribution: await RoleStatItemTransformer.transform(...),
//     permissionStats: ...,
//   };
// }
// ```
//--------------------------------------------------------------