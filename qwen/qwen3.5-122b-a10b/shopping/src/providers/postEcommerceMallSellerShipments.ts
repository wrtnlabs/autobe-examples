import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Check tracking number uniqueness
  const existingShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
      where: { tracking_number: props.body.trackingNumber },
    });
  if (existingShipment !== null) {
    throw new HttpException("Tracking number already exists", 400);
  }
  // Validate and fetch all order items with their relationships
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
    },
    include: {
      productVariant: {
        include: {
          product: {
            select: { seller_id: true },
          },
        },
      },
    },
  });
  if (orderItems.length === 0) {
    throw new HttpException("No order items found", 400);
  }
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("Some order items not found", 404);
  }
  // Validate all order items belong to the seller and have 'paid' status
  for (const item of orderItems) {
    if (item.productVariant.product.seller_id !== props.seller.id) {
      throw new HttpException("Order items must belong to your products", 403);
    }
    if (item.status !== "paid") {
      throw new HttpException(
        `Order item ${item.id} is not in paid status`,
        400,
      );
    }
  }
  // Create shipment and update order items in transaction
  const [shipment] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_shipments.create({
      data: await EcommerceMallShipmentCollector.collect({
        body: props.body,
        ecommerceMallSellers: { id: props.seller.id } as unknown as {
          id: string & tags.Format<"uuid">;
        },
      }),
      ...EcommerceMallShipmentTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch order items for the response with proper relationships
  const shipmentOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_price: true,
            created_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                phone_number: true,
                account_status: true,
                created_at: true,
              },
            },
          },
        },
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            stock_quantity: true,
          },
        },
      },
    });
  // Transform shipment
  const transformed =
    await EcommerceMallShipmentTransformer.transform(shipment);
  // Transform order items
  transformed.order_items = await Promise.all(
    shipmentOrderItems.map(async (item) => {
      const payload = {
        ...item,
        order: item.order,
        productVariant: item.productVariant,
      };
      return await EcommerceMallOrderItemTransformer.transform(payload as any);
    }),
  );
  return transformed;
}
