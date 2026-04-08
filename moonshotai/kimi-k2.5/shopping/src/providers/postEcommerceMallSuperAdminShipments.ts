import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminShipments(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Fetch order items to validate they exist and check ownership/status
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
    },
    select: {
      id: true,
      seller_id: true,
      status: true,
    },
  });
  // Validate all order items exist
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("Some order items not found", 404);
  }
  // Validate all belong to same seller
  const sellerId = orderItems[0]!.seller_id;
  const allSameSeller = orderItems.every((item) => item.seller_id === sellerId);
  if (!allSameSeller) {
    throw new HttpException(
      "All order items must belong to the same seller",
      400,
    );
  }
  // Validate all have 'paid' status
  const allPaid = orderItems.every((item) => item.status === "paid");
  if (!allPaid) {
    throw new HttpException("All order items must have status 'paid'", 400);
  }
  // Execute transaction: create shipment with items + update order item statuses
  const nowISO = toISOStringSafe(new Date());
  const [created] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_shipments.create({
      data: await EcommerceMallShipmentCollector.collect({
        body: props.body,
        seller: { id: sellerId },
      }),
      ...EcommerceMallShipmentTransformer.select(),
    }),
    // Update order items to 'shipped' status
    MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: nowISO,
      },
    }),
  ]);
  return await EcommerceMallShipmentTransformer.transform(created);
}
