import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerShipmentsShipmentIdTracking(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IShoppingMallShipment> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_seller_id: true,
        tracking_number: true,
        tracking_carrier: true,
        status: true,
        shipped_at: true,
        customer_confirmed_at: true,
        auto_confirmed_at: true,
        cancelled_at: true,
        order: {
          select: {
            id: true,
            total_price: true,
            status: true,
            created_at: true,
            shopping_mall_customer_id: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        deliveryConfirmations: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_delivery_confirmationsFindManyArgs,
        items: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_shipment_itemsFindManyArgs,
        statusLogs: {
          select: { id: true, status: true },
        } satisfies Prisma.shopping_mall_shipment_status_logsFindManyArgs,
        autoConfirmations: {
          select: { id: true, confirmed_at: true },
        } satisfies Prisma.shopping_mall_delivery_auto_confirmationsFindManyArgs,
      },
    });
  if (shipment.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallShipmentTransformer.transform(shipment);
}
