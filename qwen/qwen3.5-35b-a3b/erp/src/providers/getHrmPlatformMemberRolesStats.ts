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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberRolesStats(props: {
  member: MemberPayload;
}): Promise<IPlatformRoleStat> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gte: new Date() },
    },
  });
  if (!session?.organization_id) {
    throw new HttpException("No active organization context", 400);
  }
  const organizationId = session.organization_id;
  const roleStatsAggregate = await MyGlobal.prisma.hrm_platform_roles.aggregate(
    {
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    },
  );
  const builtInCount = await MyGlobal.prisma.hrm_platform_roles.count({
    where: {
      organization_id: organizationId,
      deleted_at: null,
      role_kind: "built_in",
    },
  });
  const customCount = await MyGlobal.prisma.hrm_platform_roles.count({
    where: {
      organization_id: organizationId,
      deleted_at: null,
      role_kind: "custom",
    },
  });
  const employeeDistribution =
    await MyGlobal.prisma.hrm_platform_roles.findMany({
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        employees: {
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
          },
        },
      },
    });
  const totalPermissions = await MyGlobal.prisma.hrm_platform_permissions.count(
    {
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
    },
  );
  const uniquePermissionCodesGroupBy =
    await MyGlobal.prisma.hrm_platform_permissions.groupBy({
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      by: ["code"],
      _count: true,
    });
  const uniquePermissionCodes = uniquePermissionCodesGroupBy.length;
  const totalEmployees = employeeDistribution.reduce(
    (sum, role) => sum + role.employees.length,
    0,
  );
  return {
    roleStats: {
      total: roleStatsAggregate._count.id satisfies number as number &
        tags.Type<"int32">,
      builtIn: builtInCount satisfies number as number & tags.Type<"int32">,
      custom: customCount satisfies number as number & tags.Type<"int32">,
    },
    employeeDistribution: {
      role_id:
        employeeDistribution[0]?.id ?? (v4() as string & tags.Format<"uuid">),
      name: employeeDistribution[0]?.name ?? "No Roles Assigned",
      employee_count: totalEmployees satisfies number as number &
        tags.Type<"int32">,
    },
    permissionStats: {
      total_permissions: totalPermissions satisfies number as number &
        tags.Type<"int32">,
      unique_permission_codes:
        uniquePermissionCodes satisfies number as number & tags.Type<"int32">,
    },
  };
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