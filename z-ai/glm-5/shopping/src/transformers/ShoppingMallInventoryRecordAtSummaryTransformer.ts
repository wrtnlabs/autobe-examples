import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        order: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_ordersFindFirstArgs,
        cancellationRequest: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindFirstArgs,
        refundRequest: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_refund_requestsFindFirstArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_sellersFindFirstArgs,
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord.ISummary> {
    const sourceType = input.seller
      ? "manual"
      : input.order
        ? "order"
        : input.cancellationRequest
          ? "cancellation"
          : "refund";
    return {
      id: input.id,
      quantityChange: input.quantity_change,
      reason: input.reason,
      sourceType,
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
