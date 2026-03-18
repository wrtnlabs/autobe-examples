import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformOrganizationSnapshotTransformer {
  export type Payload = Prisma.hrm_platform_organization_snapshotsGetPayload<
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
        hrmPlatformOrganization:
          HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_organization_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationSnapshot> {
    return {
      id: input.id,
      hrmPlatformOrganization:
        await HrmPlatformOrganizationAtSummaryTransformer.transform(
          input.hrmPlatformOrganization,
        ),
      name: input.name,
      description: input.description ?? null,
      logo_url: input.logo_url ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
    };
  }
}
