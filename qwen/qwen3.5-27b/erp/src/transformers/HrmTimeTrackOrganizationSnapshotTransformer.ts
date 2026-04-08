import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackOrganizationSnapshotTransformer {
  export type Payload = Prisma.hrm_time_track_organization_snapshotsGetPayload<
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
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_organization_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackOrganizationSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logo_url: input.logo_url,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
    };
  }
}
