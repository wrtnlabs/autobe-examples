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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallShipmentItemTransformer } from "../transformers/EcommerceMallShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId, deleted_at: null },
      select: {
        id: true,
        seller_id: true,
        order_id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
            customer_id: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        shipmentItems: EcommerceMallShipmentItemTransformer.select(),
        delivery: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs,
      },
    });
  if (shipment.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: shipment.id,
    carrier_name: shipment.carrier_name,
    tracking_number: shipment.tracking_number,
    shipped_at: shipment.shipped_at.toISOString(),
    status: shipment.delivery ? "delivered" : "in_transit",
    created_at: shipment.created_at.toISOString(),
    updated_at: shipment.updated_at.toISOString(),
    deleted_at: shipment.deleted_at?.toISOString() ?? null,
    seller: await EcommerceMallSellerAtSummaryTransformer.transform(
      shipment.seller,
    ),
    shipment_items: await ArrayUtil.asyncMap(
      shipment.shipmentItems,
      EcommerceMallShipmentItemTransformer.transform,
    ),
  };
}
