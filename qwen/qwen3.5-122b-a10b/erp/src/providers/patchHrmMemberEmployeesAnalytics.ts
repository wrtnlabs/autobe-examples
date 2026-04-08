import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalytic";
import { IHrmEmployeeAnalyticIDepartmentBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIDepartmentBreakdown";
import { IHrmEmployeeAnalyticIEmploymentTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIEmploymentTypeBreakdown";
import { IHrmEmployeeAnalyticIRoleBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIRoleBreakdown";
import { IHrmEmployeeAnalyticIStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIStatusBreakdown";
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

export async function patchHrmMemberEmployeesAnalytics(props: {
  member: MemberPayload;
  body: IHrmEmployeeAnalytic.IRequest;
}): Promise<IHrmEmployeeAnalytic> {
  // Get member's organization through their employee record
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const organizationId = employee.organization_id;
  // Build base filter
  const whereInput: Prisma.hrm_employeesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  // Apply date range filter
  if (props.body.date_range) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.date_range.start) {
      dateFilter.gte = props.body.date_range.start;
    }
    if (props.body.date_range.end) {
      dateFilter.lte = props.body.date_range.end;
    }
    if (Object.keys(dateFilter).length > 0) {
      whereInput.created_at = dateFilter;
    }
  }
  // Apply department filter
  if (props.body.department_id) {
    whereInput.department_id = props.body.department_id;
  }
  // Apply employment types filter
  if (props.body.employment_types && props.body.employment_types.length > 0) {
    whereInput.employment_type = {
      in: props.body.employment_types,
    };
  }
  // Apply status filter
  if (props.body.statuses && props.body.statuses.length > 0) {
    whereInput.status = {
      in: props.body.statuses,
    };
  }
  // Get total count
  const totalCount = await MyGlobal.prisma.hrm_employees.count({
    where: whereInput,
  });
  // Get employment type breakdown
  const employmentTypeData = await MyGlobal.prisma.hrm_employees.groupBy({
    by: ["employment_type"],
    where: whereInput,
    _count: {
      employment_type: true,
    },
  });
  const employmentTypeBreakdown: IHrmEmployeeAnalyticIEmploymentTypeBreakdown[] =
    employmentTypeData.map((item) => {
      const typeValue = item.employment_type;
      const isValidType =
        typeValue === "full-time" ||
        typeValue === "part-time" ||
        typeValue === "contractor" ||
        typeValue === "intern";
      if (!isValidType) {
        throw new HttpException(`Invalid employment type: ${typeValue}`, 500);
      }
      return {
        employment_type: typeValue,
        count: item._count.employment_type,
      };
    });
  // Get status breakdown
  const statusData = await MyGlobal.prisma.hrm_employees.groupBy({
    by: ["status"],
    where: whereInput,
    _count: {
      status: true,
    },
  });
  const statusBreakdown: IHrmEmployeeAnalyticIStatusBreakdown[] =
    statusData.map((item) => {
      const statusValue = item.status;
      const isValidStatus =
        statusValue === "active" || statusValue === "deactivated";
      if (!isValidStatus) {
        throw new HttpException(`Invalid status: ${statusValue}`, 500);
      }
      return {
        status: statusValue,
        count: item._count.status,
      };
    });
  // Get department breakdown - need to handle null department_id as "unassigned"
  const employeesWithDepartments = await MyGlobal.prisma.hrm_employees.findMany(
    {
      where: whereInput,
      select: {
        department_id: true,
      },
    },
  );
  // Group by department_id manually
  const departmentCountMap = new Map<string | null, number>();
  for (const emp of employeesWithDepartments) {
    const key = emp.department_id;
    departmentCountMap.set(key, (departmentCountMap.get(key) || 0) + 1);
  }
  // Get department names for non-null department_ids
  const departmentIds = Array.from(departmentCountMap.keys()).filter(
    (id): id is string => id !== null,
  );
  const departments =
    departmentIds.length > 0
      ? await MyGlobal.prisma.hrm_departments.findMany({
          where: {
            id: {
              in: departmentIds,
            },
            organization_id: organizationId,
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];
  const departmentMap = new Map(departments.map((d) => [d.id, d.name]));
  const departmentBreakdown: IHrmEmployeeAnalyticIDepartmentBreakdown[] = [];
  for (const [departmentId, count] of departmentCountMap.entries()) {
    if (count > 0) {
      departmentBreakdown.push({
        department_id: departmentId,
        department_name:
          departmentId === null
            ? "Unassigned"
            : departmentMap.get(departmentId) || "Unknown",
        count: count,
      });
    }
  }
  // Get role breakdown - need to handle null role_id as "unassigned"
  const employeesWithRoles = await MyGlobal.prisma.hrm_employees.findMany({
    where: whereInput,
    select: {
      role_id: true,
    },
  });
  // Group by role_id manually
  const roleCountMap = new Map<string | null, number>();
  for (const emp of employeesWithRoles) {
    const key = emp.role_id;
    roleCountMap.set(key, (roleCountMap.get(key) || 0) + 1);
  }
  // Get role names for non-null role_ids
  const roleIds = Array.from(roleCountMap.keys()).filter(
    (id): id is string => id !== null,
  );
  const roles =
    roleIds.length > 0
      ? await MyGlobal.prisma.hrm_roles.findMany({
          where: {
            id: {
              in: roleIds,
            },
            hrm_organization_id: organizationId,
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];
  const roleMap = new Map(roles.map((r) => [r.id, r.name]));
  const roleBreakdown: IHrmEmployeeAnalyticIRoleBreakdown[] = [];
  for (const [roleId, count] of roleCountMap.entries()) {
    if (count > 0) {
      roleBreakdown.push({
        role_id: roleId,
        role_name:
          roleId === null ? "Unassigned" : roleMap.get(roleId) || "Unknown",
        count: count,
      });
    }
  }
  return {
    total_count: totalCount,
    employment_type_breakdown: employmentTypeBreakdown,
    status_breakdown: statusBreakdown,
    department_breakdown: departmentBreakdown,
    role_breakdown: roleBreakdown,
  } satisfies IHrmEmployeeAnalytic;
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
// import { IHrmEmployeeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalytic";
// import { IHrmEmployeeAnalyticIEmploymentTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIEmploymentTypeBreakdown";
// import { IHrmEmployeeAnalyticIStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIStatusBreakdown";
// import { IHrmEmployeeAnalyticIDepartmentBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIDepartmentBreakdown";
// import { IHrmEmployeeAnalyticIRoleBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIRoleBreakdown";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberEmployeesAnalytics(props: {
//   member: MemberPayload;
//   body: IHrmEmployeeAnalytic.IRequest;
// }): Promise<IHrmEmployeeAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------