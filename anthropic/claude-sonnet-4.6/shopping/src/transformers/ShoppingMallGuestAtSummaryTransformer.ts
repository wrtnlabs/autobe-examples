import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallGuestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallGuest.ISummary> {
    return {
      id: input.id,
      token: input.token,
      sessions_count: input.sessions.length,
      created_at: input.created_at.toISOString(),
    };
  }
}
