import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmContractAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmContract.ISummary> {
    return {
      id: input.id,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date?.toISOString() ?? null,
      payRate: Number(input.pay_rate),
      payPeriod: input.pay_period,
      workingHoursPerWeek: Number(input.working_hours_per_week),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    };
  }
}
