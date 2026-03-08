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
        shop_name: true,
        shop_description: true,
        logo_image: true,
        approval_status: true,
        rejection_reason: true,
        suspended: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        products: true,
        inventoryRecords: true,
        orderItems: true,
        shipments: true,
        cancellationRequests: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      logo_image: input.logo_image,
      approval_status: input.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      suspended: input.suspended,
      banned: input.banned,
      created_at: input.created_at.toISOString(),
    };
  }
}
