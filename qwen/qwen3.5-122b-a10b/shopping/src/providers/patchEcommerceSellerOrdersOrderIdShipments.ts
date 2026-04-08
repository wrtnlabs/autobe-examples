import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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
import { EcommerceShipmentAtSummaryTransformer } from "../transformers/EcommerceShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  // Validate order exists
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Validate seller has access (owns items in the order)
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      order: { id: props.orderId },
      seller: { id: props.seller.id },
    },
    select: { id: true },
  });
  if (orderItems.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_shipmentsWhereInput = {
    order_id: props.orderId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.carrier_name && {
      carrier_name: {
        contains: props.body.carrier_name,
        mode: "insensitive",
      },
    }),
  };
  // Query shipments
  const records = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceShipmentAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceShipmentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceShipment.ISummary;
}
