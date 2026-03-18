import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingGuestSessionTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        erp_hrm_time_tracking_guest_id: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingGuestSession> {
    return {
      id: input.id,
      guestId: input.erp_hrm_time_tracking_guest_id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
    };
  }
}
