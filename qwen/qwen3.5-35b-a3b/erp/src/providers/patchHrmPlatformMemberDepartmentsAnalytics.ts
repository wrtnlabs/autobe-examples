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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartmentsAnalytics(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.IAnalyticsRequest;
}): Promise<IHrmPlatformDepartment.IAnalytic> {
  const { member, body } = props;
  // Step 1: Get organization context from member's employee record
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: member.id,
        is_pending: false,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  const organizationId: string & tags.Format<"uuid"> =
    employee.hrm_platform_organization_id;
  // Step 2: Build base WHERE clause for department queries
  const baseWhere: Prisma.hrm_platform_departmentsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  // Step 3: Apply hierarchy_type filter
  const hierarchyType = body.hierarchy_type;
  if (hierarchyType === "root") {
    baseWhere.parent_department_id = null;
  } else if (hierarchyType === "child") {
    baseWhere.parent_department_id = { not: null };
  }
  // Step 4: Apply date_range filter (created_at BETWEEN from AND to)
  if (body.date_range) {
    baseWhere.created_at = {
      gte: new Date(body.date_range.from),
      lte: new Date(body.date_range.to),
    };
  }
  // Step 5: Apply name_filter (name LIKE %value%)
  if (body.name_filter) {
    baseWhere.name = {
      contains: body.name_filter,
      mode: "insensitive",
    };
  }
  // Step 6: Calculate employee counts per department
  const employeeCounts = await MyGlobal.prisma.hrm_platform_employees.groupBy({
    by: ["hrm_platform_department_id"],
    where: {
      hrm_platform_organization_id: organizationId,
      hrm_platform_department_id: { not: null },
    },
    _count: { id: true },
  });
  const employeeCountMap = new Map(
    employeeCounts.map(
      (e) => [e.hrm_platform_department_id, e._count.id] as [string, number],
    ),
  );
  // Step 7: Apply employee_count_filter
  if (body.employee_count_filter) {
    const { min, max } = body.employee_count_filter;
    const validDepartmentIds: string[] = Array.from(
      employeeCountMap.keys(),
    ).filter((deptId) => {
      const count = employeeCountMap.get(deptId) ?? 0;
      return count >= min && count <= max;
    });
    if (validDepartmentIds.length === 0) {
      return {
        totalCount: 0,
        rootDepartmentCount: 0,
        childDepartmentCount: 0,
        departmentWithMostEmployees:
          typia.random<IHrmPlatformDepartment.ISummary>(),
        averageEmployeesPerDepartment: 0,
        totalEmployeeCount: 0,
        departments: [],
      };
    }
    baseWhere.id = { in: validDepartmentIds };
  }
  // Step 8: Determine sorting
  const sortBy = body.sort_by ?? "name";
  const sortOrder = body.sort_order ?? "asc";
  // Step 9: Apply pagination
  const page = Math.max(body.page ?? 1, 1);
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  // Step 10: Calculate total count
  const totalCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrm_platform_departments.count({
      where: baseWhere,
    });
  // Step 11: Calculate root department count
  const rootDepartmentCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrm_platform_departments.count({
      where: { ...baseWhere, parent_department_id: null },
    });
  // Step 12: Calculate child department count
  const childDepartmentCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrm_platform_departments.count({
      where: { ...baseWhere, parent_department_id: { not: null } },
    });
  // Step 13: Get department with most employees
  const prismaOrderBy: Prisma.hrm_platform_departmentsOrderByWithRelationInput[] =
    sortBy === "employee_count"
      ? []
      : sortBy === "name"
        ? [{ name: sortOrder }]
        : [{ created_at: sortOrder }];
  const [departmentWithMostEmployeesRaw] =
    await MyGlobal.prisma.hrm_platform_departments.findMany({
      where: baseWhere,
      take: 1,
      orderBy: prismaOrderBy,
      ...HrmPlatformDepartmentAtSummaryTransformer.select(),
    });
  if (!departmentWithMostEmployeesRaw) {
    throw new HttpException("No departments found", 404);
  }
  const departmentWithMostEmployees =
    await HrmPlatformDepartmentAtSummaryTransformer.transform(
      departmentWithMostEmployeesRaw,
    );
  // Step 14: Calculate total employee count
  const totalEmployeeCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: organizationId,
        hrm_platform_department_id: { not: null },
      },
    });
  // Step 15: Calculate average employees per department
  const averageEmployeesPerDepartment: number =
    totalCount > 0 ? totalEmployeeCount / totalCount : 0;
  // Step 16: Get paginated departments list
  const departmentsRaw =
    await MyGlobal.prisma.hrm_platform_departments.findMany({
      where: baseWhere,
      skip,
      take: limit,
      orderBy: prismaOrderBy,
      ...HrmPlatformDepartmentAtSummaryTransformer.select(),
    });
  // Step 17: Transform and add employee_count to each department
  const departments = await ArrayUtil.asyncMap(departmentsRaw, async (dept) => {
    const transformed =
      await HrmPlatformDepartmentAtSummaryTransformer.transform(dept);
    const employeeCount = employeeCountMap.get(dept.id) ?? 0;
    return {
      ...transformed,
      employee_count: employeeCount,
    };
  });
  // Step 18: Sort client-side if sorting by employee_count
  const finalDepartments =
    sortBy === "employee_count"
      ? [...departments].sort((a, b) => {
          const countA = a.employee_count;
          const countB = b.employee_count;
          return sortOrder === "asc" ? countA - countB : countB - countA;
        })
      : departments;
  // Step 19: Return IAnalytic response
  return {
    totalCount,
    rootDepartmentCount,
    childDepartmentCount,
    departmentWithMostEmployees,
    averageEmployeesPerDepartment,
    totalEmployeeCount,
    departments: finalDepartments,
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