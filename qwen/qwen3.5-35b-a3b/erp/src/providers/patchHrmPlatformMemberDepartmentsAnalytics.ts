import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartmentsAnalytics(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.IAnalyticsRequest;
}): Promise<IHrmPlatformDepartment.IAnalytic> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        organization_id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.hrm_platform_departmentsWhereInput = {
    deleted_at: null,
    ...(session.organization_id && {
      organization_id: session.organization_id,
    }),
  };
  if (props.body.hierarchy_type === "root") {
    baseWhere.parent_department_id = null;
  } else if (props.body.hierarchy_type === "child") {
    baseWhere.parent_department_id = { not: null };
  }
  if (props.body.date_range) {
    baseWhere.created_at = {
      gte: new Date(props.body.date_range.from),
      lte: new Date(props.body.date_range.to),
    };
  }
  if (props.body.name_filter) {
    baseWhere.name = {
      contains: props.body.name_filter,
      mode: "insensitive",
    };
  }
  const orderInput: Prisma.hrm_platform_departmentsOrderByWithRelationInput[] =
    [
      ...(props.body.sort_by === "name"
        ? [{ name: props.body.sort_order ?? "asc" }]
        : []),
      ...(props.body.sort_by === "created_at"
        ? [{ created_at: props.body.sort_order ?? "asc" }]
        : []),
      ...(props.body.sort_by === "employee_count"
        ? [{ employees: { _count: props.body.sort_order ?? "asc" } as any }]
        : []),
    ];
  const employeeCounts = await MyGlobal.prisma.hrm_platform_employees.groupBy({
    by: ["hrm_platform_department_id"],
    where: {
      deleted_at: null,
      hrm_platform_department_id: { not: null },
    },
    _count: { id: true },
  });
  const countsMap = new Map(
    employeeCounts.map((e) => [
      e.hrm_platform_department_id,
      e._count.id as number,
    ]),
  );
  const [totalCount, departments] = await Promise.all([
    MyGlobal.prisma.hrm_platform_departments.count({
      where: baseWhere,
    }),
    MyGlobal.prisma.hrm_platform_departments.findMany({
      where: baseWhere,
      orderBy: orderInput,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization_id: true,
        parent_department_id: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        parentDepartment: HrmPlatformDepartmentAtSummaryTransformer.select(),
        employees: { select: { id: true } },
      },
    }),
  ]);
  const rootDepartmentCount =
    await MyGlobal.prisma.hrm_platform_departments.count({
      where: {
        ...baseWhere,
        parent_department_id: null,
      },
    });
  const childDepartmentCount =
    await MyGlobal.prisma.hrm_platform_departments.count({
      where: {
        ...baseWhere,
        parent_department_id: { not: null },
      },
    });
  const totalEmployeeCount = await MyGlobal.prisma.hrm_platform_employees.count(
    {
      where: {
        deleted_at: null,
        hrm_platform_department_id: { not: null },
      },
    },
  );
  const averageEmployeesPerDepartment =
    totalCount > 0 ? totalEmployeeCount / totalCount : 0;
  const departmentWithMostEmployeesResult =
    await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: baseWhere,
      orderBy: {
        employees: { _count: "desc" },
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization_id: true,
        parent_department_id: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        parentDepartment: HrmPlatformDepartmentAtSummaryTransformer.select(),
        employees: { select: { id: true } },
      },
    });
  const departmentsWithCounts = departments.map((dept) => ({
    ...dept,
    employee_count: countsMap.get(dept.id) ?? 0,
  }));
  const result: IHrmPlatformDepartment.IAnalytic = {
    totalCount,
    rootDepartmentCount,
    childDepartmentCount,
    departmentWithMostEmployees: departmentWithMostEmployeesResult
      ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
          departmentWithMostEmployeesResult,
        )
      : {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          name: "No Data",
          created_at: new Date("9999-12-31T23:59:59.999Z").toISOString(),
          updated_at: new Date("9999-12-31T23:59:59.999Z").toISOString(),
          organization: {
            id:
              session.organization_id ??
              ("00000000-0000-0000-0000-000000000000" as string &
                tags.Format<"uuid">),
            name: "Unknown",
            description: null,
            currency: undefined,
            timezone: undefined,
            fiscal_start_month: undefined,
            created_at: new Date("9999-12-31T23:59:59.999Z").toISOString(),
            updated_at: new Date("9999-12-31T23:59:59.999Z").toISOString(),
            deleted_at: null,
            owner: {
              id:
                session.organization_id ??
                ("00000000-0000-0000-0000-000000000000" as string &
                  tags.Format<"uuid">),
              email: "",
              is_active: false,
              created_at: new Date("9999-12-31T23:59:59.999Z").toISOString(),
              updated_at: new Date("9999-12-31T23:59:59.999Z").toISOString(),
              deleted_at: null,
            } satisfies IHrmPlatformMember.ISummary,
          } satisfies IHrmPlatformOrganization.ISummary,
          parentDepartment: null,
        },
    averageEmployeesPerDepartment,
    totalEmployeeCount,
    departments: await HrmPlatformDepartmentAtSummaryTransformer.transformAll(
      departmentsWithCounts,
    ),
  };
  return result;
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
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberDepartmentsAnalytics(props: {
//   member: MemberPayload;
//   body: IHrmPlatformDepartment.IAnalyticsRequest;
// }): Promise<IHrmPlatformDepartment.IAnalytic> {
//   return {
//     totalCount: ...,
//     rootDepartmentCount: ...,
//     childDepartmentCount: ...,
//     departmentWithMostEmployees: await HrmPlatformDepartmentAtSummaryTransformer.transform(...),
//     averageEmployeesPerDepartment: ...,
//     totalEmployeeCount: ...,
//     departments: await HrmPlatformDepartmentAtSummaryTransformer.transformAll(...),
//   };
// }
// ```
//--------------------------------------------------------------