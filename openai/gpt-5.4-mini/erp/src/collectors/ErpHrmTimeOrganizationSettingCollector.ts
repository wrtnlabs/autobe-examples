import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeOrganizationSettingCollector {
  export async function collect(props: {
    body: IErpHrmTimeOrganizationSetting.ICreate;
    erpHrmTimeOrganizations: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      currency_code: props.body.currencyCode,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscalStartMonth,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.erpHrmTimeOrganizations.id,
        },
      },
    } satisfies Prisma.erp_hrm_time_organization_settingsCreateInput;
  }
}
