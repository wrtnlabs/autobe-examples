import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractCompensation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractCompensation";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmContractCompensation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractCompensation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmDepartmentAtSummaryTransformer } from "../transformers/HrmDepartmentAtSummaryTransformer";
import { HrmMemberAtSummaryTransformer } from "../transformers/HrmMemberAtSummaryTransformer";
import { HrmOrganizationAtSummaryTransformer } from "../transformers/HrmOrganizationAtSummaryTransformer";
import { HrmRoleAtSummaryTransformer } from "../transformers/HrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdReportsContractCompensation(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IPageIHrmContractCompensation.ISummary> {
  // Validate organization exists and is not soft-deleted
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Check member has time:view_all permission via employee role
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              hrmPermission: {
                select: { permission_name: true },
              },
            },
          },
        },
      },
    },
  });
  if (!employee || !employee.role) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission = employee.role.rolePermissions.some(
    (rp: {
      hrmPermission: {
        permission_name: string;
      };
    }) => rp.hrmPermission.permission_name === "time:view_all",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Get pagination parameters (defaults since no request body)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query contracts with employee and department
  const contracts = await MyGlobal.prisma.hrm_contracts.findMany({
    where: {
      deleted_at: null,
      employee: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      pay_rate: true,
      pay_period: true,
      working_hours_per_week: true,
      start_date: true,
      end_date: true,
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
          user: HrmMemberAtSummaryTransformer.select(),
          organization: HrmOrganizationAtSummaryTransformer.select(),
          role: HrmRoleAtSummaryTransformer.select(),
          department: HrmDepartmentAtSummaryTransformer.select(),
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_contracts.count({
    where: {
      deleted_at: null,
      employee: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
    },
  });
  // Transform to DTO
  const data = await ArrayUtil.asyncMap(contracts, async (contract) => {
    const employeeData = contract.employee;
    const departmentData = employeeData.department;
    const employeeSummary: IHrmEmployee.ISummary = {
      id: employeeData.id,
      position: employeeData.position,
      employment_type: employeeData.employment_type,
      status: employeeData.status,
      user: await HrmMemberAtSummaryTransformer.transform(employeeData.user),
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        employeeData.organization,
      ),
      role: await HrmRoleAtSummaryTransformer.transform(employeeData.role),
      department: departmentData
        ? await HrmDepartmentAtSummaryTransformer.transform(departmentData)
        : null,
      created_at: toISOStringSafe(employeeData.created_at),
    };
    const departmentSummary: IHrmDepartment.ISummary | null = departmentData
      ? await HrmDepartmentAtSummaryTransformer.transform(departmentData)
      : null;
    return {
      id: contract.id,
      pay_rate: contract.pay_rate,
      pay_period: contract.pay_period,
      working_hours_per_week: contract.working_hours_per_week ?? null,
      start_date: toISOStringSafe(contract.start_date),
      end_date: contract.end_date ? toISOStringSafe(contract.end_date) : null,
      employee: employeeSummary,
      department: departmentSummary,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
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
// import { IPageIHrmContractCompensation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractCompensation";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmContractCompensation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractCompensation";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdReportsContractCompensation(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IPageIHrmContractCompensation.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------