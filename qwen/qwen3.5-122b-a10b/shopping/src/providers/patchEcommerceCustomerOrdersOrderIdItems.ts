import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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
  customer: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  // Verify order exists and belongs to the customer
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      ecommerce_customer_id: props.customer.id,
    },
  });
  // Build where clause
  const whereInput: Prisma.ecommerce_order_itemsWhereInput = {
    ecommerce_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.sellerId !== undefined && {
      ecommerce_seller_id: props.body.sellerId,
    }),
    ...(props.body.dateFrom !== undefined && {
      created_at: {
        gte: props.body.dateFrom,
      },
    }),
    ...(props.body.dateTo !== undefined && {
      created_at: {
        ...(props.body.dateFrom !== undefined
          ? { gte: props.body.dateFrom }
          : {}),
        lte: props.body.dateTo,
      },
    }),
  } satisfies Prisma.ecommerce_order_itemsWhereInput;
  // Build orderBy clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const finalOrderBy = (
    sortBy === "status"
      ? { status: sortOrder as Prisma.SortOrder }
      : sortBy === "quantity"
        ? { quantity: sortOrder as Prisma.SortOrder }
        : sortBy === "unit_price"
          ? { unit_price: sortOrder as Prisma.SortOrder }
          : { created_at: sortOrder as Prisma.SortOrder }
  ) satisfies Prisma.ecommerce_order_itemsOrderByWithRelationInput;
  // Handle pagination
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = props.body.cursor !== undefined ? 1 : 0;
  // Decode cursor if provided
  let cursor:
    | {
        created_at: string & tags.Format<"date-time">;
        id: string & tags.Format<"uuid">;
      }
    | undefined;
  if (props.body.cursor !== undefined) {
    try {
      const decoded = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString(),
      );
      cursor = {
        created_at: decoded.created_at,
        id: decoded.id,
      };
    } catch {
      cursor = undefined;
    }
  }
  // Query order items using transformer's select to match expected type
  const records = await MyGlobal.prisma.ecommerce_order_items.findMany({
    ...EcommerceOrderItemAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: finalOrderBy,
    skip,
    ...(cursor !== undefined ? { cursor } : {}),
    take: limit,
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceOrderItemAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceOrderItem.ISummary;
}
