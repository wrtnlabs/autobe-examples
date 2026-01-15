import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartSessionTransformer {
  export type Payload = Prisma.shopping_mall_cart_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        session_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cart: true,
      },
    } satisfies Prisma.shopping_mall_cart_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartSession> {
    return {
      id: input.id,
      customer_id: input.session_id,
      created_at: input.created_at.toISOString(),
      item_count: 0,
      total_price: 0,
      guest_session: input.session_id === null,
      expires_at: input.updated_at.toISOString(),
      session_status: "active",
    };
  }
}
