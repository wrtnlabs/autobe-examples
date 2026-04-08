import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractExpirationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractExpirationSummary";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmContractExpirationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractExpirationSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeAtSummaryTransformer } from "../transformers/HrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdReportsContractExpirations(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IPageIHrmContractExpirationSummary> {
  // Validate organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId, deleted_at: null },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Check employee record exists for this member in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
    select: { role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check employee:view permission
  const role = await MyGlobal.prisma.hrm_roles.findUnique({
    where: { id: employee.role_id },
    include: {
      rolePermissions: {
        include: { hrmPermission: true },
      },
    },
  });
  if (role === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission = role.rolePermissions.some(
    (rp) => rp.hrmPermission.permission_name === "employee:view",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters (defaults since not in function signature)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause for active contracts in organization
  const whereInput: Prisma.hrm_contractsWhereInput = {
    deleted_at: null,
    end_date: null,
    employee: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
  } satisfies Prisma.hrm_contractsWhereInput;
  // Get total count
  const total = await MyGlobal.prisma.hrm_contracts.count({
    where: whereInput,
  });
  // Query contracts with employee data
  const contracts = await MyGlobal.prisma.hrm_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { start_date: "desc" },
    include: {
      employee: HrmEmployeeAtSummaryTransformer.select(),
    },
  });
  // Transform to response DTO
  const defaultWarningDays: number & tags.Type<"int32"> = 90;
  const data = await ArrayUtil.asyncMap(
    contracts,
    async (contract): Promise<IHrmContractExpirationSummary> => {
      const employeeSummary = await HrmEmployeeAtSummaryTransformer.transform(
        contract.employee,
      );
      // Calculate days until expiration (for active contracts with NULL end_date,
      // use default warning period of 90 days from current date)
      const daysUntilExpiration: number & tags.Type<"int32"> =
        defaultWarningDays;
      return {
        id: contract.id,
        organization_id: contract.employee.organization.id,
        employee: employeeSummary,
        start_date: toISOStringSafe(contract.start_date),
        end_date: contract.end_date ? toISOStringSafe(contract.end_date) : null,
        pay_rate: contract.pay_rate,
        pay_period: contract.pay_period,
        working_hours_per_week: contract.working_hours_per_week ?? null,
        days_until_expiration: daysUntilExpiration,
      } satisfies IHrmContractExpirationSummary;
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmContractExpirationSummary;
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
// import { IPageIHrmContractExpirationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractExpirationSummary";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmContractExpirationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractExpirationSummary";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdReportsContractExpirations(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IPageIHrmContractExpirationSummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------