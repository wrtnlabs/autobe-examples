import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingOwnerTransformer } from "./HrmTimeTrackingOwnerTransformer";

export namespace HrmTimeTrackingOwnerSessionAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_owner_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        owner: HrmTimeTrackingOwnerTransformer.select(),
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_owner_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOwnerSession.ISummary> {
    return {
      id: input.id,
      owner: await HrmTimeTrackingOwnerTransformer.transform(input.owner),
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
