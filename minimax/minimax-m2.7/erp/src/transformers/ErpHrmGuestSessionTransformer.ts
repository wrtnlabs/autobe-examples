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
        expired_at: true,
        guest: ErpHrmGuestAtSummaryTransformer.select(),
        href: true,
        created_at: true,
        ip: true,
        referrer: true,
      },
    } satisfies Prisma.erp_hrm_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmGuestSession> {
    return {
      id: input.id,
      expired_at: input.expired_at.toISOString(),
      guest: await ErpHrmGuestAtSummaryTransformer.transform(input.guest),
      href: input.href,
      created_at: input.created_at.toISOString(),
      ip: input.ip,
      referrer: input.referrer,
    };
  }
}
