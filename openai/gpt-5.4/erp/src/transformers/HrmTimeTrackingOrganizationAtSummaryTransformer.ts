import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency_code: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      logo_uri: input.logo_uri ?? null,
      currency_code: input.currency_code,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
