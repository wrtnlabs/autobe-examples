import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerApprovalAtApprovalResponseTransformer {
  export type Payload = Prisma.shopping_mall_seller_approvalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        shopping_mall_seller_id: true,
        rejection_reason: true,
        processed_at: true,
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_date: true,
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApproval.IApprovalResponse> {
    return {
      id: input.id,
      approval_status: input.status,
      shopping_mall_seller_id: input.shopping_mall_seller_id,
      rejection_reason: input.rejection_reason ?? null,
      processed_at: input.processed_at
        ? toISOStringSafe(input.processed_at)
        : null,
      shop_name: input.seller.shop_name,
      approval_date: input.seller.approval_date
        ? toISOStringSafe(input.seller.approval_date)
        : new Date().toISOString(),
    };
  }
}
