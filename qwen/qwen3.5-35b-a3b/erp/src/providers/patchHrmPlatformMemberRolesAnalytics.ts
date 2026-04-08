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
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
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
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  const organization_id: string = session.organization_id!;
  const roleWhere: Prisma.hrm_platform_rolesWhereInput = {
    organization_id,
    deleted_at: null,
  };
  if (props.body.role_kind !== undefined) {
    roleWhere.role_kind = props.body.role_kind;
  }
  if (props.body.name !== undefined) {
    roleWhere.name = {
      contains: props.body.name,
      mode: "insensitive" as const,
    };
  }
  const allRoles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: roleWhere,
    orderBy: { name: "asc" },
    skip,
    take: limit,
  });
  const roleEntries: IRoleAnalyticsEntry[] = [];
  let total_permission_count: number = 0;
  let roles_with_employees: number = 0;
  let roles_without_employees: number = 0;
  for (const role of allRoles) {
    const permission_count_result =
      await MyGlobal.prisma.hrm_platform_permissions.aggregate({
        where: {
          role_id: role.id,
          deleted_at: null,
        },
        _count: {
          id: true,
        },
      });
    const permission_count = permission_count_result._count.id ?? 0;
    const employee_count_result =
      await MyGlobal.prisma.hrm_platform_employees.aggregate({
        where: {
          hrm_platform_role_id: role.id,
          deleted_at: null,
        },
        _count: {
          id: true,
        },
      });
    const employee_count = employee_count_result._count.id ?? 0;
    if (
      props.body.min_permission_count !== undefined &&
      permission_count < props.body.min_permission_count
    ) {
      continue;
    }
    if (
      props.body.max_permission_count !== undefined &&
      permission_count > props.body.max_permission_count
    ) {
      continue;
    }
    if (props.body.has_employees === true && employee_count === 0) {
      continue;
    }
    if (props.body.has_employees === false && employee_count > 0) {
      continue;
    }
    roleEntries.push({
      id: role.id,
      name: role.name,
      description: role.description ?? "",
      role_kind: typia.assert<"custom" | "built_in">(role.role_kind),
      is_custom: role.role_kind === "custom",
      permission_count,
      employee_count,
    });
    total_permission_count += permission_count;
    if (employee_count > 0) {
      roles_with_employees++;
    } else {
      roles_without_employees++;
    }
  }
  if (props.body.sort_by === "employees") {
    roleEntries.sort((a, b) => b.employee_count - a.employee_count);
  }
  const total_count_result = await MyGlobal.prisma.hrm_platform_roles.aggregate(
    {
      where: roleWhere,
      _count: {
        id: true,
      },
    },
  );
  const builtInRoleWhere: Prisma.hrm_platform_rolesWhereInput = {
    ...roleWhere,
    role_kind: "built_in",
  };
  const customRoleWhere: Prisma.hrm_platform_rolesWhereInput = {
    ...roleWhere,
    role_kind: "custom",
  };
  const built_in_count_result =
    await MyGlobal.prisma.hrm_platform_roles.aggregate({
      where: builtInRoleWhere,
      _count: {
        id: true,
      },
    });
  const custom_count_result =
    await MyGlobal.prisma.hrm_platform_roles.aggregate({
      where: customRoleWhere,
      _count: {
        id: true,
      },
    });
  return {
    total_count: total_count_result._count.id,
    built_in_count: built_in_count_result._count.id,
    custom_count: custom_count_result._count.id,
    total_permission_count,
    roles_with_employees,
    roles_without_employees,
    roles: roleEntries,
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