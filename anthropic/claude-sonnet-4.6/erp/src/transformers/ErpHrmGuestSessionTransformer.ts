import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmGuestAtSummaryTransformer } from "./ErpHrmGuestAtSummaryTransformer";

export namespace ErpHrmGuestSessionTransformer {
  export type Payload = Prisma.erp_hrm_guest_sessionsGetPayload<
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
        guest: ErpHrmGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmGuestSession> {
    return {
      id: input.id,
      guest: await ErpHrmGuestAtSummaryTransformer.transform(input.guest),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
    };
  }
}
