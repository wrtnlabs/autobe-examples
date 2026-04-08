import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractAnalytic";
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

export async function getHrmMemberOrganizationsOrganizationIdAnalyticsContracts(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmContractAnalytic> {
  // Verify member has access to this organization by checking employee record
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all contracts for employees in the organization with soft-delete filters
  const contracts = await MyGlobal.prisma.hrm_contracts.findMany({
    where: {
      employee: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      deleted_at: null,
    },
    include: {
      employee: {
        select: {
          employment_type: true,
        },
      },
    },
  });
  // Calculate total counts
  const total = contracts.length;
  const active = contracts.filter((c) => c.end_date === null).length;
  const historical = contracts.filter((c) => c.end_date !== null).length;
  // Pay period distribution
  const hourly = contracts.filter((c) => c.pay_period === "hourly").length;
  const daily = contracts.filter((c) => c.pay_period === "daily").length;
  const weekly = contracts.filter((c) => c.pay_period === "weekly").length;
  const monthly = contracts.filter((c) => c.pay_period === "monthly").length;
  // Average pay by period
  const hourlyContracts = contracts.filter((c) => c.pay_period === "hourly");
  const dailyContracts = contracts.filter((c) => c.pay_period === "daily");
  const weeklyContracts = contracts.filter((c) => c.pay_period === "weekly");
  const monthlyContracts = contracts.filter((c) => c.pay_period === "monthly");
  const averagePayByPeriod = {
    hourly:
      hourlyContracts.length > 0
        ? hourlyContracts.reduce((sum, c) => sum + c.pay_rate, 0) /
          hourlyContracts.length
        : 0,
    daily:
      dailyContracts.length > 0
        ? dailyContracts.reduce((sum, c) => sum + c.pay_rate, 0) /
          dailyContracts.length
        : 0,
    weekly:
      weeklyContracts.length > 0
        ? weeklyContracts.reduce((sum, c) => sum + c.pay_rate, 0) /
          weeklyContracts.length
        : 0,
    monthly:
      monthlyContracts.length > 0
        ? monthlyContracts.reduce((sum, c) => sum + c.pay_rate, 0) /
          monthlyContracts.length
        : 0,
  } satisfies IHrmContractAnalytic["compensation_stats"]["average_pay_by_period"];
  // Average working hours per week (only for contracts where it's defined)
  const contractsWithHours = contracts.filter(
    (c) => c.working_hours_per_week !== null,
  );
  const averageWorkingHoursPerWeek =
    contractsWithHours.length > 0
      ? contractsWithHours.reduce(
          (sum, c) => sum + c.working_hours_per_week!,
          0,
        ) / contractsWithHours.length
      : 0;
  // Employment type distribution (from employee records)
  const fullTime = contracts.filter(
    (c) => c.employee.employment_type === "full_time",
  ).length;
  const partTime = contracts.filter(
    (c) => c.employee.employment_type === "part_time",
  ).length;
  const contractor = contracts.filter(
    (c) => c.employee.employment_type === "contractor",
  ).length;
  const intern = contracts.filter(
    (c) => c.employee.employment_type === "intern",
  ).length;
  return {
    total_counts: {
      total,
      active,
      historical,
    } satisfies IHrmContractAnalytic["total_counts"],
    pay_period_distribution: {
      hourly,
      daily,
      weekly,
      monthly,
    } satisfies IHrmContractAnalytic["pay_period_distribution"],
    compensation_stats: {
      average_pay_by_period: averagePayByPeriod,
      average_working_hours_per_week: averageWorkingHoursPerWeek,
    } satisfies IHrmContractAnalytic["compensation_stats"],
    employment_type_distribution: {
      full_time: fullTime,
      part_time: partTime,
      contractor,
      intern,
    } satisfies IHrmContractAnalytic["employment_type_distribution"],
  } satisfies IHrmContractAnalytic;
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
// import { IHrmContractAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractAnalytic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdAnalyticsContracts(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmContractAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------