import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        guest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_guestsFindManyArgs,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.shopping_mall_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallGuestSession.ISummary> {
    return {
      id: input.id,
      userId: input.guest.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      status: input.expired_at < new Date() ? "expired" : "active",
    };
  }
}
