import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { EcommerceOrderItemAtSummaryTransformer } from "../transformers/EcommerceOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  // Verify order belongs to customer
  const order = await MyGlobal.prisma.ecommerce_orders.findFirst({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Build where clause based on request filters
  const whereInput = {
    order_id: props.orderId,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.seller_id !== undefined &&
      props.body.seller_id !== null && { seller_id: props.body.seller_id }),
    ...(props.body.product_variant_id !== undefined &&
      props.body.product_variant_id !== null && {
        product_variant_id: props.body.product_variant_id,
      }),
    ...(props.body.min_quantity !== undefined &&
      props.body.min_quantity !== null && {
        quantity: { gte: props.body.min_quantity },
      }),
    ...(props.body.max_quantity !== undefined &&
      props.body.max_quantity !== null && {
        quantity: { lte: props.body.max_quantity },
      }),
    ...(props.body.min_unit_price !== undefined &&
      props.body.min_unit_price !== null && {
        unit_price: { gte: props.body.min_unit_price },
      }),
    ...(props.body.max_unit_price !== undefined &&
      props.body.max_unit_price !== null && {
        unit_price: { lte: props.body.max_unit_price },
      }),
    ...(props.body.min_total_price !== undefined &&
      props.body.min_total_price !== null && {
        total_price: { gte: props.body.min_total_price },
      }),
    ...(props.body.max_total_price !== undefined &&
      props.body.max_total_price !== null && {
        total_price: { lte: props.body.max_total_price },
      }),
  } satisfies Prisma.ecommerce_order_itemsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Query data with pagination using transformer select
  const data = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    ...EcommerceOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  // Transform data using available transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceOrderItemAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
