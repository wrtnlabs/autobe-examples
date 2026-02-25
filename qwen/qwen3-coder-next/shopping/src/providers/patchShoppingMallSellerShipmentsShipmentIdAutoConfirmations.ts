import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDeliveryAutoConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryAutoConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallDeliveryAutoConfirmationTransformer } from "../transformers/ShoppingMallDeliveryAutoConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentsShipmentIdAutoConfirmations(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallDeliveryAutoConfirmation.ICreate;
}): Promise<IShoppingMallDeliveryAutoConfirmation> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_order_id: true,
      },
    });
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingConfirmation =
    await MyGlobal.prisma.shopping_mall_delivery_auto_confirmations.findFirst({
      where: { shopping_mall_shipment_id: props.shipmentId, deleted_at: null },
    });
  if (existingConfirmation) {
    throw new HttpException("Auto confirmation already exists", 409);
  }
  const confirmedAtDate = new Date(props.body.confirmed_at);
  const createdAtDate = new Date();
  const confirmation =
    await MyGlobal.prisma.shopping_mall_delivery_auto_confirmations.create({
      data: {
        id: props.body.shopping_mall_shipment_id as string,
        confirmed_at: toISOStringSafe(confirmedAtDate),
        auto_confirmed_by: props.body.auto_confirmed_by,
        created_at: toISOStringSafe(createdAtDate),
        updated_at: toISOStringSafe(createdAtDate),
        deleted_at: null,
        shipment: { connect: { id: props.shipmentId } },
      },
      ...ShoppingMallDeliveryAutoConfirmationTransformer.select(),
    });
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { shopping_mall_order_id: shipment.shopping_mall_order_id },
    data: {
      item_status: "delivered" as const,
    },
  });
  await updateOrderStatus(shipment.shopping_mall_order_id);
  return await ShoppingMallDeliveryAutoConfirmationTransformer.transform(
    confirmation,
  );
}
async function updateOrderStatus(orderId: string): Promise<void> {
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: orderId },
    select: { item_status: true },
  });
  const statuses = items.map((i) => i.item_status);
  const uniqueStatuses = new Set(statuses);
  let newStatus: string = "delivered";
  if (uniqueStatuses.size === 1 && uniqueStatuses.has("delivered")) {
    newStatus = "delivered";
  } else if (uniqueStatuses.has("cancelled")) {
    newStatus = "cancelled";
  } else if (uniqueStatuses.has("refunded")) {
    newStatus = "refunded";
  } else if (uniqueStatuses.has("shipped")) {
    newStatus = "shipped";
  } else if (uniqueStatuses.has("paid")) {
    newStatus = "paid";
  }
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: orderId },
    data: { status: newStatus },
  });
}
