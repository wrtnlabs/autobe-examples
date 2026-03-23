import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformOrganizationSettingTransformer {
  export type Payload = Prisma.hrm_platform_organization_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        currency: true,
        timezone: true,
        fiscal_year_start_month: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_platform_organization_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationSetting> {
    return {
      id: input.id,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_year_start_month: input.fiscal_year_start_month,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
