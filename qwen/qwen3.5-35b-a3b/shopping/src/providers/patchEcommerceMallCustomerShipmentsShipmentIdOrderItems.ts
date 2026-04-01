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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentsOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallShipmentsOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipmentsShipmentIdOrderItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentsOrderItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentsOrderItem.ISummary> {
  // 1. Verify shipment exists
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
      },
    });
  // 2. Verify customer owns the order containing this shipment
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: shipment.ecommerce_mall_order_id,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 3. Build where clause for shipment order items
  const whereInput: Prisma.ecommerce_mall_shipments_order_itemsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.shippedQuantity !== undefined && {
      shipped_quantity: props.body.shippedQuantity,
    }),
    ...(props.body.search !== undefined && {
      orderItem: {
        OR: [
          {
            product_name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            variant_name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      },
    }),
  } satisfies Prisma.ecommerce_mall_shipments_order_itemsWhereInput;
  // 4. Build order by clause
  const orderByInput: Prisma.ecommerce_mall_shipments_order_itemsOrderByWithRelationInput[] =
    [
      props.body.sortBy === "shipped_quantity"
        ? { shipped_quantity: props.body.sortOrder === "desc" ? "desc" : "asc" }
        : { created_at: props.body.sortOrder === "desc" ? "desc" : "asc" },
    ];
  // 5. Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.count({
      where: whereInput,
    });
  // 6. Get paginated data
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallShipmentsOrderItemAtSummaryTransformer.select(),
    });
  // 7. Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallShipmentsOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallShipmentsOrderItem.ISummary;
}
