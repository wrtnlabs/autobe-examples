import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentsOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentsOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallShipmentsOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdOrderItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentsOrderItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentsOrderItem.ISummary> {
  // Validate shipment exists and seller has access
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    include: {
      seller: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Build where clause with filters
  const whereInput: Prisma.ecommerce_mall_shipments_order_itemsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.shippedQuantity !== undefined
      ? { shipped_quantity: props.body.shippedQuantity }
      : {}),
    ...(props.body.search
      ? {
          orderItem: {
            product_name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_shipments_order_itemsWhereInput;
  // Build order by
  const orderByInput: Prisma.ecommerce_mall_shipments_order_itemsOrderByWithRelationInput[] =
    props.body.sortBy === "shipped_quantity"
      ? [
          {
            shipped_quantity: props.body.sortOrder === "desc" ? "desc" : "asc",
          },
        ]
      : [{ created_at: props.body.sortOrder === "desc" ? "desc" : "asc" }];
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get data and total count
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallShipmentsOrderItemAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentsOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
