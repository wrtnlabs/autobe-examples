import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallGuestSessionTransformer } from "./ShoppingMallGuestSessionTransformer";

export namespace ShoppingMallGuestTransformer {
  export type Payload = Prisma.shopping_mall_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        sessions: ShoppingMallGuestSessionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallGuest> {
    return {
      id: input.id,
      token: input.token,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        ShoppingMallGuestSessionTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
