import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_platform_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      logo_url: input.logo_url ?? undefined,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
