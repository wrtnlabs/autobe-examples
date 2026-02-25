import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerApprovalAtApprovalRequestTransformer {
  export type Payload = Prisma.shopping_mall_seller_approvalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        seller: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_seller_approvalsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApproval.IApprovalRequest> {
    return {
      approval_action: input.status,
      rejection_reason: input.rejection_reason,
    };
  }
}
