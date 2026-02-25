import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSuspensionTransformer {
  // 1. Payload type first
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        approval_status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISuspension> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      approval_status: input.approval_status,
      suspended: input.approval_status === "pending",
      suspension_reason: input.rejection_reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
