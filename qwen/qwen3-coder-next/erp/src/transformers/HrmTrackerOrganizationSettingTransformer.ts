import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerOrganizationSettingTransformer {
  export type Payload = Prisma.hrm_tracker_organization_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fiscal_start_month: true,
        currency: true,
        timezone: true,
        name: true,
        logo_url: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_tracker_organization_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerOrganizationSetting> {
    return {
      fiscal_start_month: input.fiscal_start_month,
      currency: input.currency,
      timezone: input.timezone,
      name: input.name,
      logo_url: input.logo_url ?? null,
    };
  }
}
