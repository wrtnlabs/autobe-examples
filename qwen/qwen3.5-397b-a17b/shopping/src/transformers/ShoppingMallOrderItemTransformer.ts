import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "./ShoppingMallCancellationRequestAtSummaryTransformer";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemSnapshotTransformer } from "./ShoppingMallOrderItemSnapshotTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "./ShoppingMallRefundRequestAtSummaryTransformer";
import { ShoppingMallReviewAtSummaryTransformer } from "./ShoppingMallReviewAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        product: ShoppingMallProductAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
        snapshot: ShoppingMallOrderItemSnapshotTransformer.select(),
        refundRequest: ShoppingMallRefundRequestAtSummaryTransformer.select(),
        cancellationRequest:
          ShoppingMallCancellationRequestAtSummaryTransformer.select(),
        review: ShoppingMallReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shipment: input.shipment
        ? await ShoppingMallShipmentAtSummaryTransformer.transform(
            input.shipment,
          )
        : null,
      snapshot: await ShoppingMallOrderItemSnapshotTransformer.transform(
        input.snapshot!,
      ),
      cancellationRequest: input.cancellationRequest
        ? await ShoppingMallCancellationRequestAtSummaryTransformer.transform(
            input.cancellationRequest,
          )
        : null,
      refundRequest: input.refundRequest
        ? await ShoppingMallRefundRequestAtSummaryTransformer.transform(
            input.refundRequest,
          )
        : null,
      review: input.review
        ? await ShoppingMallReviewAtSummaryTransformer.transform(input.review)
        : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    } satisfies IShoppingMallOrderItem;
  }
}
