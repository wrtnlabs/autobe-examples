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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Find seller associated with this admin
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { ecommerce_mall_admin_id: props.admin.id },
    select: { id: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found for this admin account", 404);
  }
  // Validate all order items exist, belong to seller, and are 'paid'
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
    },
    select: {
      id: true,
      status: true,
      ecommerce_mall_seller_id: true,
    },
  });
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  const invalidItems = orderItems.filter(
    (item) =>
      item.status !== "paid" || item.ecommerce_mall_seller_id !== seller.id,
  );
  if (invalidItems.length > 0) {
    throw new HttpException(
      "All order items must belong to the authenticated seller and have status 'paid'",
      400,
    );
  }
  // Use transaction for atomic operation
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment record using collector
    const createdShipment = await tx.ecommerce_mall_shipments.create({
      data: await EcommerceMallShipmentCollector.collect({
        body: props.body,
        seller: { id: seller.id },
      }),
      ...EcommerceMallShipmentTransformer.select(),
    });
    // Create shipment_items for each order item
    await tx.ecommerce_mall_shipment_items.createMany({
      data: props.body.orderItemIds.map((orderItemId) => ({
        id: v4(),
        ecommerce_mall_shipment_id: createdShipment.id,
        ecommerce_mall_order_item_id: orderItemId,
        created_at: toISOStringSafe(new Date()),
      })),
    });
    // Update order items status to 'shipped'
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return createdShipment;
  });
  return await EcommerceMallShipmentTransformer.transform(shipment);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminShipments(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallShipment.ICreate;
// }): Promise<IEcommerceMallShipment> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.create({
//     data: await EcommerceMallShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallShipmentTransformer.select(),
//   });
//   return await EcommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------