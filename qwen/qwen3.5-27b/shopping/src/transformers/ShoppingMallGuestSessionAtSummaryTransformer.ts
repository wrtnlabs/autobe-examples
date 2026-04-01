import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        guest: { select: { id: true } },
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
    const now = new Date();
    const expiredAt = new Date(input.expired_at);
    let status: "active" | "expired" | "revoked" = "active";
    if (now >= expiredAt) {
      status = "expired";
    }
    return {
      id: input.id,
      userId: input.guest.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      status,
    };
  }
}
