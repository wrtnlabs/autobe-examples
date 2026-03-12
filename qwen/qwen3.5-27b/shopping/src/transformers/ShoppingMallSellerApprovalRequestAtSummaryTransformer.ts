import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

// ShoppingMallSellerApprovalRequestAtSummaryTransformer.ts
export namespace ShoppingMallSellerApprovalRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_seller_approval_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        submitted_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApprovalRequest.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      submitted_at: input.submitted_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
