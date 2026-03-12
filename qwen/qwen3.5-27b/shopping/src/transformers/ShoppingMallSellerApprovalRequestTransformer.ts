import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerApprovalRequestTransformer {
  export type Payload = Prisma.shopping_mall_seller_approval_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
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
  ): Promise<IShoppingMallSellerApprovalRequest> {
    return {
      id: input.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reason: input.reason,
      status: input.status,
      submitted_at: input.submitted_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
