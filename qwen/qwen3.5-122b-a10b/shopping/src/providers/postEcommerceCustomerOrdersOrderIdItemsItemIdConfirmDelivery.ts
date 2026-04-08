import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderItemTransformer } from "../transformers/EcommerceOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerOrdersOrderIdItemsItemIdConfirmDelivery(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItem> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        ecommerce_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        ecommerce_order_id: true,
        order: {
          select: {
            ecommerce_customer_id: true,
          },
        },
        shipmentItems: {
          select: {
            ecommerce_shipment_id: true,
          },
        } satisfies Prisma.ecommerce_shipment_itemsFindManyArgs,
      },
    });
  if (orderItem.order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "shipped") {
    if (orderItem.status === "delivered") {
      throw new HttpException("Order item already delivered", 409);
    }
    throw new HttpException("Order item status is not shipped", 400);
  }
  if (orderItem.shipmentItems.length > 0) {
    const shipmentId = orderItem.shipmentItems[0].ecommerce_shipment_id;
    const shipmentItems =
      await MyGlobal.prisma.ecommerce_shipment_items.findMany({
        where: {
          ecommerce_shipment_id: shipmentId,
          deleted_at: null,
        },
        select: {
          ecommerce_order_item_id: true,
        },
      });
    const orderItemIds = shipmentItems.map((si) => si.ecommerce_order_item_id);
    await MyGlobal.prisma.ecommerce_order_items.updateMany({
      where: {
        id: {
          in: orderItemIds,
        },
        deleted_at: null,
      },
      data: {
        status: "delivered",
        updated_at: new Date(),
      },
    });
    await MyGlobal.prisma.ecommerce_shipments.update({
      where: { id: shipmentId },
      data: {
        delivered_at: new Date(),
        status: "delivered",
        updated_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "delivered",
        updated_at: new Date(),
      },
    });
  }
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      ecommerce_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      status: true,
    },
  });
  const statuses = orderItems.map((item) => item.status);
  const allDelivered = statuses.every((s) => s === "delivered");
  const allCancelled = statuses.every((s) => s === "cancelled");
  const allRefunded = statuses.every((s) => s === "refunded");
  const anyShipped = statuses.some((s) => s === "shipped");
  const anyPaid = statuses.some((s) => s === "paid");
  let newOrderStatus: string;
  if (allDelivered) {
    newOrderStatus = "delivered";
  } else if (allCancelled) {
    newOrderStatus = "cancelled";
  } else if (allRefunded) {
    newOrderStatus = "refunded";
  } else if (anyShipped || anyPaid) {
    newOrderStatus = "partially_completed";
  } else {
    newOrderStatus = "paid";
  }
  await MyGlobal.prisma.ecommerce_orders.update({
    where: { id: props.orderId },
    data: {
      status: newOrderStatus,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow(
    {
      where: { id: props.itemId },
      ...EcommerceOrderItemTransformer.select(),
    },
  );
  return await EcommerceOrderItemTransformer.transform(updated);
}
