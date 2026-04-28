import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformShipmentItemCollector } from "../collectors/EcommercePlatformShipmentItemCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformShipmentItemTransformer } from "../transformers/EcommercePlatformShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommercePlatformShipmentItem.ICreate;
}): Promise<IEcommercePlatformShipmentItem> {
  const shipment =
    await MyGlobal.prisma.ecommerce_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_platform_seller_id: true,
      },
    });
  if (shipment.ecommerce_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.order_item_ids.length === 0) {
    throw new HttpException("Order item IDs array cannot be empty", 400);
  }
  const orderItems =
    await MyGlobal.prisma.ecommerce_platform_order_items.findMany({
      where: {
        id: { in: props.body.order_item_ids },
        status: "paid",
      },
      select: {
        id: true,
        ecommerce_platform_product_variant_id: true,
      },
    });
  if (orderItems.length !== props.body.order_item_ids.length) {
    throw new HttpException(
      "Some order items are not found or not in paid status",
      400,
    );
  }
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
      },
      select: {
        id: true,
      },
    });
  if (sellerProfile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  const sellerProducts =
    await MyGlobal.prisma.ecommerce_platform_products.findMany({
      where: {
        ecommerce_platform_seller_profile_id: sellerProfile.id,
      },
      select: {
        id: true,
      },
    });
  const productIds = new Set(sellerProducts.map((p) => p.id));
  const sellerProductVariants =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findMany({
      where: {
        ecommerce_platform_product_id: { in: [...productIds] },
      },
      select: {
        id: true,
      },
    });
  const sellerVariantIds = new Set(sellerProductVariants.map((v) => v.id));
  const unownedItems = orderItems.filter(
    (oi) => !sellerVariantIds.has(oi.ecommerce_platform_product_variant_id),
  );
  if (unownedItems.length > 0) {
    throw new HttpException(
      "All order items must belong to the same seller",
      403,
    );
  }
  const existingCount =
    await MyGlobal.prisma.ecommerce_platform_shipment_items.count({
      where: {
        ecommerce_platform_order_item_id: { in: props.body.order_item_ids },
      },
    });
  if (existingCount > 0) {
    throw new HttpException(
      "Some order items are already assigned to a shipment",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    for (const orderId of props.body.order_item_ids) {
      await tx.ecommerce_platform_shipment_items.create({
        data: await EcommercePlatformShipmentItemCollector.collect({
          body: { order_item_ids: [orderId] },
          ecommercePlatformShipments: { id: props.shipmentId },
          orderItem: { id: orderId },
        }),
      });
    }
    await tx.ecommerce_platform_order_items.updateMany({
      where: {
        id: { in: props.body.order_item_ids },
      },
      data: {
        status: "shipped",
        updated_at: now,
      },
    });
    await tx.ecommerce_platform_shipments.update({
      where: { id: props.shipmentId },
      data: {
        shipped_at: now,
        updated_at: now,
      },
    });
  });
  const record =
    await MyGlobal.prisma.ecommerce_platform_shipment_items.findFirstOrThrow({
      where: {
        ecommerce_platform_shipment_id: props.shipmentId,
        ecommerce_platform_order_item_id: props.body.order_item_ids[0],
      },
      ...EcommercePlatformShipmentItemTransformer.select(),
    });
  return await EcommercePlatformShipmentItemTransformer.transform(record);
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
// import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
// import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerShipmentsShipmentIdItems(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformShipmentItem.ICreate;
// }): Promise<IEcommercePlatformShipmentItem> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shipment_items.create({
//     data: await EcommercePlatformShipmentItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformShipmentItemTransformer.select(),
//   });
//   return await EcommercePlatformShipmentItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------