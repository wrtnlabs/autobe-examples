import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";

export namespace ErpHrmTimeOrganizationSettingTransformer {
  export type Payload = Prisma.erp_hrm_time_organization_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeOrganizationSetting> {
    return {
      id: input.id,
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      currencyCode: input.currency_code,
      timezone: input.timezone,
      fiscalStartMonth: input.fiscal_start_month,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      update: undefined,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        currency_code: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_organization_settingsFindManyArgs;
  }
}
