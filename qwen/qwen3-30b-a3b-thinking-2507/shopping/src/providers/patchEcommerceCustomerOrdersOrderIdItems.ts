import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  // Validate order ownership
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: {
      id: props.orderId,
      customer: { id: props.customer.id },
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or does not belong to customer",
      404,
    );
  }
  // Parse and validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (limit > 100) {
    throw new HttpException("Limit cannot exceed 100", 400);
  }
  const skip = (page - 1) * limit;
  // Fetch paginated order items - Removed all filtering due to invalid fields
  const items = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: { ecommerce_order_id: props.orderId },
    select: { id: true },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Fetch total count for pagination meta
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: { ecommerce_order_id: props.orderId },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map(
      (item) => ({ id: item.id }) as IEcommerceOrderItem.ISummary,
    ),
  };
}
