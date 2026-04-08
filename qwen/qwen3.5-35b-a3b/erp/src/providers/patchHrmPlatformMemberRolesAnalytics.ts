import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPlatformRoleAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformRoleAnalytic";
import { IRoleAnalyticsEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleAnalyticsEntry";
import { IRolesAnalyticsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRolesAnalyticsRequest";
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

export async function patchHrmPlatformMemberRolesAnalytics(props: {
  member: MemberPayload;
  body: IRolesAnalyticsRequest;
}): Promise<IPlatformRoleAnalytic> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findUnique(
    {
      where: { id: props.member.session_id },
      select: { organization_id: true },
    },
  );
  if (!session?.organization_id) {
    throw new HttpException("No organization context found", 400);
  }
  const organizationId = session.organization_id;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereRoles: Prisma.hrm_platform_rolesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  if (props.body.role_kind !== undefined) {
    whereRoles.role_kind = props.body.role_kind;
  }
  if (props.body.name !== undefined) {
    whereRoles.name = {
      contains: props.body.name,
      mode: Prisma.QueryMode.insensitive,
    };
  }
  if (props.body.has_employees === true) {
    whereRoles.employees = { some: {} };
  } else if (props.body.has_employees === false) {
    whereRoles.employees = { none: {} };
  }
  const totalCount = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereRoles,
  });
  const orderByInput: Prisma.hrm_platform_rolesOrderByWithRelationInput =
    props.body.sort_by === "employees"
      ? { employees: { _count: "desc" } }
      : { name: "asc" };
  const roles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereRoles,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      _count: {
        select: { employees: true },
      },
    },
  });
  const roleEntries = await ArrayUtil.asyncMap(roles, async (role) => {
    const permissionCount =
      await MyGlobal.prisma.hrm_platform_permissions.count({
        where: {
          role_id: role.id,
          deleted_at: null,
        },
      });
    const isCustom = role.role_kind === "custom";
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? "",
      role_kind: role.role_kind as "custom" | "built_in",
      is_custom: isCustom,
      permission_count: permissionCount,
      employee_count: role._count.employees,
    } satisfies IRoleAnalyticsEntry;
  });
  const filteredRoleEntries = roleEntries.filter((entry) => {
    if (props.body.min_permission_count !== undefined) {
      if (entry.permission_count < props.body.min_permission_count) {
        return false;
      }
    }
    if (props.body.max_permission_count !== undefined) {
      if (entry.permission_count > props.body.max_permission_count) {
        return false;
      }
    }
    return true;
  });
  const finalTotalCount = filteredRoleEntries.length;
  const finalBuiltInCount = filteredRoleEntries.filter(
    (e) => e.role_kind === "built_in",
  ).length;
  const finalCustomCount = filteredRoleEntries.filter(
    (e) => e.role_kind === "custom",
  ).length;
  const finalTotalPermissionCount = filteredRoleEntries.reduce(
    (sum, entry) => sum + entry.permission_count,
    0,
  );
  const finalRolesWithEmployees = filteredRoleEntries.filter(
    (e) => e.employee_count > 0,
  ).length;
  const finalRolesWithoutEmployees = filteredRoleEntries.filter(
    (e) => e.employee_count === 0,
  ).length;
  return {
    total_count: finalTotalCount,
    built_in_count: finalBuiltInCount,
    custom_count: finalCustomCount,
    total_permission_count: finalTotalPermissionCount,
    roles_with_employees: finalRolesWithEmployees,
    roles_without_employees: finalRolesWithoutEmployees,
    roles: filteredRoleEntries,
  } satisfies IPlatformRoleAnalytic;
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
// import { IRolesAnalyticsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRolesAnalyticsRequest";
// import { IPlatformRoleAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformRoleAnalytic";
// import { IRoleAnalyticsEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleAnalyticsEntry";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberRolesAnalytics(props: {
//   member: MemberPayload;
//   body: IRolesAnalyticsRequest;
// }): Promise<IPlatformRoleAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------