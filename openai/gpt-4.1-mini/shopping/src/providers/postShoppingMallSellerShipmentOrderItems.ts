import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentOrderItemCollector } from "../collectors/ShoppingMallShipmentOrderItemCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentOrderItemTransformer } from "../transformers/ShoppingMallShipmentOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipmentOrderItems(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentOrderItem.ICreate;
}): Promise<IShoppingMallShipmentOrderItem> {
  const sellerId = props.seller.id;
  const shipmentId = props.body.shopping_mall_shipment_id;
  const orderItemId = props.body.shopping_mall_order_item_id;
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const shipment = await prisma.shopping_mall_shipments.findUnique({
      where: { id: shipmentId },
      select: { seller_id: true, deleted_at: true },
    });
    if (
      !shipment ||
      shipment.deleted_at !== null ||
      shipment.seller_id !== sellerId
    ) {
      throw new HttpException(
        "Forbidden: Shipment not found or access denied",
        403,
      );
    }
    const orderItem = await prisma.shopping_mall_order_items.findUnique({
      where: { id: orderItemId },
      select: {
        deleted_at: true,
        productVariant: {
          select: {
            product: {
              select: {
                seller_id: true,
              },
            },
          },
        },
      },
    });
    if (!orderItem || orderItem.deleted_at !== null) {
      throw new HttpException(
        "Forbidden: Order item not found or deleted",
        403,
      );
    }
    if (orderItem.productVariant.product.seller_id !== sellerId) {
      throw new HttpException(
        "Forbidden: Order item does not belong to seller",
        403,
      );
    }
    const createInput = await ShoppingMallShipmentOrderItemCollector.collect({
      body: props.body,
    });
    const created = await prisma.shopping_mall_shipment_order_items.create({
      data: createInput,
      ...ShoppingMallShipmentOrderItemTransformer.select(),
    });
    return await ShoppingMallShipmentOrderItemTransformer.transform(created);
  });
}
