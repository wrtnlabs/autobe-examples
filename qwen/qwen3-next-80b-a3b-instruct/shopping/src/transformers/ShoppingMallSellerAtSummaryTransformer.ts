import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_active: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        approved_at: true,
        deleted_at: true,
        suspended_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        products: true,
        cartItems: true,
        orderItems: true,
        snapshots: true,
        shipments: true,
        refundResponses: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      shop_name: "",
      logo_url: "",
      status: input.status,
    };
  }
}
