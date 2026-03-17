import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_seller_id: true,
        shipped_at: true,
        delivered_at: true,
        orderItems: {
          select: {
            id: true,
            status: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    });
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.orderItems.length === 0) {
    throw new HttpException("Empty shipment composition", 400);
  }
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment already delivered", 400);
  }
  if (shipment.orderItems.every((item) => item.status === "delivered")) {
    throw new HttpException("Shipment already delivered", 400);
  }
  const deliveredAtText =
    props.body.delivered_at ?? toISOStringSafe(new Date());
  const updatedAtText = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_shipments.update({
      where: {
        id: props.shipmentId,
      },
      data: {
        delivered_at: new Date(deliveredAtText),
        updated_at: new Date(updatedAtText),
      },
    });
    await tx.shopping_mall_order_items.updateMany({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
      },
      data: {
        status: "delivered",
        delivered_at: new Date(deliveredAtText),
        updated_at: new Date(updatedAtText),
      },
    });
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: shipment.shopping_mall_order_id,
        deleted_at: null,
      },
      select: {
        status: true,
      },
    });
    if (
      orderItems.length !== 0 &&
      orderItems.every((item) => item.status === "delivered")
    ) {
      await tx.shopping_mall_orders.update({
        where: {
          id: shipment.shopping_mall_order_id,
        },
        data: {
          status: "delivered",
          updated_at: new Date(updatedAtText),
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(updated);
}
