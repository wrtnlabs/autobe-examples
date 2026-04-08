import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_post_purchase_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        seller_response: true,
        created_at: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_post_purchase_cancellation_requestsFindManyArgs,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_post_purchase_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPostPurchaseCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      seller_response: input.seller_response,
      created_at: input.created_at.toISOString(),
      seller: input.seller
        ? await ShoppingMallSellerAtSummaryTransformer.transform(input.seller)
        : null,
    } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.ISummary;
  }
}
