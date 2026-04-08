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
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  if (props.body.order_item_ids.length === 0) {
    throw new HttpException("At least one order item must be provided", 400);
  }
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const sellerOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        shopping_mall_seller_id: props.seller.id,
        status: "paid",
        shopping_mall_shipment_id: null,
      },
    });
  const providedIds = props.body.order_item_ids;
  const sellerItemIdsSet = new Set(sellerOrderItems.map((item) => item.id));
  for (const providedId of providedIds) {
    if (!sellerItemIdsSet.has(providedId)) {
      throw new HttpException(
        "Order item not found or does not belong to seller or already shipped",
        400,
      );
    }
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipment = await tx.shopping_mall_shipments.create({
      data: await ShoppingMallShipmentCollector.collect({
        body: props.body,
        shoppingMallOrders: { id: props.orderId },
        shoppingMallSellers: { id: props.seller.id },
      }),
    });
    await tx.shopping_mall_order_items.updateMany({
      where: {
        id: { in: providedIds },
      },
      data: {
        shopping_mall_shipment_id: shipment.id,
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return shipment;
  });
  const shipmentWithRelations =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: result.id },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(shipmentWithRelations);
}
