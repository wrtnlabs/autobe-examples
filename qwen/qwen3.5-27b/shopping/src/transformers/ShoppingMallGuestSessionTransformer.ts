import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallGuestAtSummaryTransformer } from "./ShoppingMallGuestAtSummaryTransformer";

export namespace ShoppingMallGuestSessionTransformer {
  export type Payload = Prisma.shopping_mall_guest_sessionsGetPayload<
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
        guest: ShoppingMallGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallGuestSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await ShoppingMallGuestAtSummaryTransformer.transform(input.guest),
    };
  }
}
