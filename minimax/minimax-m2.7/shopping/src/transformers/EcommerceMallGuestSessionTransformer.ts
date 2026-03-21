import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallGuestAtSummaryTransformer } from "./EcommerceMallGuestAtSummaryTransformer";

export namespace EcommerceMallGuestSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_guest_sessionsGetPayload<
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
        guest: EcommerceMallGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuestSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await EcommerceMallGuestAtSummaryTransformer.transform(
        input.guest,
      ),
    };
  }
}
