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
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify all order items exist, belong to seller, and are in 'paid' status
    const orderItems = await tx.ecommerce_mall_order_items.findMany({
      where: {
        id: { in: props.body.orderItemIds },
        status: "paid",
      },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_seller_id: true,
      },
    });
    if (orderItems.length !== props.body.orderItemIds.length) {
      throw new HttpException(
        "Some order items not found or not in paid status",
        400,
      );
    }
    // Verify all items belong to the same seller
    const firstSellerId = orderItems[0].ecommerce_mall_seller_id;
    if (
      !orderItems.every(
        (item) => item.ecommerce_mall_seller_id === firstSellerId,
      )
    ) {
      throw new HttpException(
        "All order items must belong to the same seller",
        400,
      );
    }
    // Use collector for shipment data preparation
    const shipmentData = await EcommerceMallShipmentCollector.collect({
      body: props.body,
      superAdmin: props.superAdmin,
      orderItems,
    });
    // Create shipment
    const shipment = await tx.ecommerce_mall_shipments.create({
      data: shipmentData,
    });
    // Create shipment items
    await tx.ecommerce_mall_shipment_items.createMany({
      data: orderItems.map((item) => ({
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_shipment_id: shipment.id,
        ecommerce_mall_order_item_id: item.id,
        created_at: new Date().toISOString(),
      })),
    });
    // Update order items status to shipped
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: new Date().toISOString(),
      },
    });
    return shipment;
  });
  // Fetch complete shipment with relations using transformer select
  const shipmentWithRelations =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: created.id },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(
    shipmentWithRelations,
  );
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
// export async function postEcommerceMallSuperAdminShipments(props: {
//   superAdmin: SuperadminPayload;
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