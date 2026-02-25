import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  // Verify the order exists and contains items from this seller
  const orderItemsCount = await MyGlobal.prisma.ecommerce_order_items.count({
    where: {
      // Fix: Use correct Prisma field name
      order_id: props.orderId,
      productVariant: {
        product: {
          ecommerce_seller_id: props.seller.id,
        },
      },
    },
  });
  if (orderItemsCount === 0) {
    throw new HttpException(
      "Order not found or contains no items from your shop",
      404,
    );
  }
  // Build complex WHERE condition with proper joins
  const whereInput = {
    ecommerce_seller_id: props.seller.id,
    ...(props.body.tracking_number && {
      tracking_number: { contains: props.body.tracking_number },
    }),
    ...(props.body.carrier_name && {
      carrier_name: { contains: props.body.carrier_name },
    }),
    ...(props.body.shipment_status && {
      shipment_status: props.body.shipment_status,
    }),
    ...(props.body.created_at_min || props.body.created_at_max
      ? {
          created_at: {
            ...(props.body.created_at_min && {
              gte: props.body.created_at_min,
            }),
            ...(props.body.created_at_max && {
              lte: props.body.created_at_max,
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_shipmentsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const shipments = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    } satisfies Prisma.ecommerce_shipmentsOrderByWithRelationInput,
  });
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where: whereInput,
  });
  // Fix: Use correct Prisma model name
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUnique({
    where: { id: props.seller.id },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  return {
    data: shipments.map(
      (shipment) =>
        ({
          id: shipment.id as string & tags.Format<"uuid">,
          trackingNumber: shipment.tracking_number,
          carrierName: shipment.carrier_name,
          shipmentStatus: shipment.shipment_status,
          createdAt: toISOStringSafe(shipment.created_at) as string &
            tags.Format<"date-time">,
          shippedAt: shipment.shipped_at
            ? (toISOStringSafe(shipment.shipped_at) as string &
                tags.Format<"date-time">)
            : null,
          deliveredAt: shipment.delivered_at
            ? (toISOStringSafe(shipment.delivered_at) as string &
                tags.Format<"date-time">)
            : null,
          estimatedDelivery: shipment.estimated_delivery
            ? (toISOStringSafe(shipment.estimated_delivery) as string &
                tags.Format<"date-time">)
            : null,
          seller: {
            id: seller.id as string & tags.Format<"uuid">,
            email: seller.email as string & tags.Format<"email">,
            shop_name: seller.shop_name,
            shop_description: seller.shop_description,
            logo_image_url: seller.logo_image_url,
            account_status: seller.account_status,
            created_at: toISOStringSafe(seller.created_at) as string &
              tags.Format<"date-time">,
          } satisfies IEcommerceSeller.ISummary,
        }) satisfies IEcommerceShipment.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
