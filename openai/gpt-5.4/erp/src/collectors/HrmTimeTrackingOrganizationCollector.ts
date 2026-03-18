import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingOrganizationCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingOrganization.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      logo_uri: props.body.logo_uri ?? null,
      currency_code: props.body.currency_code,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.hrm_time_tracking_organizationsCreateInput;
  }
}
