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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemAtSummaryTransformer } from "../transformers/EcommerceOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  // Verify order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_order_itemsWhereInput = {
    ecommerce_order_id: props.orderId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.sellerId && {
      ecommerce_seller_id: props.body.sellerId,
    }),
    ...(props.body.dateFrom && {
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo && {
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  } satisfies Prisma.ecommerce_order_itemsWhereInput;
  // Build orderBy clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder: "asc" | "desc" =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.ecommerce_order_itemsOrderByWithRelationInput =
    sortBy === "status"
      ? { status: sortOrder }
      : sortBy === "quantity"
        ? { quantity: sortOrder }
        : sortBy === "unit_price"
          ? { unit_price: sortOrder }
          : { created_at: sortOrder };
  // Handle cursor-based pagination
  const take = limit;
  let skipInput: number | undefined = skip;
  let cursorInput:
    | {
        created_at: Date;
        id: string;
      }
    | undefined = undefined;
  if (props.body.cursor) {
    const cursorData = typia.assert<{
      created_at: string;
      id: string;
    }>(JSON.parse(Buffer.from(props.body.cursor, "base64").toString()));
    cursorInput = {
      created_at: new Date(cursorData.created_at),
      id: cursorData.id,
    };
    skipInput = undefined;
  }
  // Fetch order items
  const records = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    ...(cursorInput
      ? {
          cursor: cursorInput,
          skip: 1,
        }
      : {
          skip: skipInput,
        }),
    take,
    ...EcommerceOrderItemAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceOrderItemAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceOrderItem.ISummary;
}
