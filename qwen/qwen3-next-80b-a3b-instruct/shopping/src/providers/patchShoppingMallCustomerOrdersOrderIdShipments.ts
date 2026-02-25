import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Validate ownership: customer must own the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause based on IRequest filters
  const whereInput = {
    order_id: props.orderId,
    ...(props.body.carrier_name && {
      carrier_name: { contains: props.body.carrier_name, mode: "insensitive" },
    }),
    ...(props.body.tracking_number && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive",
      },
    }),
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  // Query shipments with shipment items and their order items
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { shipped_at: "asc" },
    select: {
      id: true,
      carrier_name: true,
      tracking_number: true,
      shipped_at: true,
      created_at: true,
      updated_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          created_at: true,
          deleted_at: true,
          password_hash: true,
          is_active: true,
          status: true,
          rejection_reason: true,
          approved_at: true,
          suspended_at: true,
        },
      },
      order: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          status: true,
          customer_id: true,
          shipping_address_id: true,
          total_price: true,
        },
      },
      shipmentItems: {
        select: {
          orderItem: {
            select: {
              status: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  // Count total matching shipments
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  // Transform each shipment into summary format
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallShipmentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallShipment.ISummary;
}
