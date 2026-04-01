import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: {
        in: props.body.order_item_ids,
      },
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      status: true,
    },
  });
  if (orderItems.length !== props.body.order_item_ids.length) {
    throw new HttpException("Some order items do not exist", 400);
  }
  for (const item of orderItems) {
    if (item.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Order item does not belong to this seller", 403);
    }
    if (item.status !== "paid") {
      throw new HttpException(
        `Order item status is ${item.status}, must be 'paid'`,
        400,
      );
    }
  }
  const existingShipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        order_item_id: {
          in: props.body.order_item_ids,
        },
      },
    });
  if (existingShipmentItems.length > 0) {
    throw new HttpException(
      "Some order items are already assigned to a shipment",
      400,
    );
  }
  const created = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: await ShoppingMallShipmentCollector.collect({
      body: props.body,
      seller: props.seller,
    }),
    ...ShoppingMallShipmentTransformer.select(),
  });
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: {
      id: {
        in: props.body.order_item_ids,
      },
    },
    data: {
      status: "shipped",
      updated_at: new Date(),
    },
  });
  return await ShoppingMallShipmentTransformer.transform(created);
}
