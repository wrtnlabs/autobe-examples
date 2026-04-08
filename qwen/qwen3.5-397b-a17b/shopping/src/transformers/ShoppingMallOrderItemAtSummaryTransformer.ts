import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
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
        order: {
          select: {
            code: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
        snapshot: true,
        cancellationRequests: true,
        refundRequest: true,
        cancellationRequest: true,
        refundRequests: true,
        review: true,
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      orderCode: input.order.code,
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
    } satisfies IShoppingMallOrderItem.ISummary;
  }
}
