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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceOrderItemAtSummaryTransformer } from "../transformers/EcommerceOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  // Verify order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Build where clause
  const whereConditions: Prisma.ecommerce_order_itemsWhereInput[] = [
    {
      ecommerce_order_id: props.orderId,
      deleted_at: null,
      ecommerce_seller_id: props.seller.id,
    },
  ];
  if (props.body.status !== undefined) {
    whereConditions.push({ status: props.body.status });
  }
  if (props.body.sellerId !== undefined) {
    whereConditions.push({ ecommerce_seller_id: props.body.sellerId });
  }
  if (props.body.dateFrom !== undefined) {
    whereConditions.push({
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    });
  }
  if (props.body.dateTo !== undefined) {
    whereConditions.push({
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    });
  }
  const whereInput: Prisma.ecommerce_order_itemsWhereInput = {
    AND: whereConditions,
  } satisfies Prisma.ecommerce_order_itemsWhereInput;
  // Build orderBy clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput =
    typia.assert<Prisma.ecommerce_order_itemsOrderByWithRelationInput>(
      sortBy === "status"
        ? { status: sortOrder }
        : sortBy === "quantity"
          ? { quantity: sortOrder }
          : sortBy === "unit_price"
            ? { unit_price: sortOrder }
            : { created_at: sortOrder },
    );
  // Pagination
  const limit = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >(Math.min(props.body.limit ?? 20, 100));
  const page = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    props.body.page ?? 1,
  );
  const skip = (page - 1) * limit;
  // Query order items
  const records = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceOrderItemAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceOrderItem.ISummary;
}
