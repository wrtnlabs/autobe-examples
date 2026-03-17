import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify order exists and belongs to customer
  await MyGlobal.prisma.ecommerce_mall_orders
    .findUniqueOrThrow({
      where: {
        id: props.orderId,
      },
      select: {
        id: true,
        customer_id: true,
      },
    })
    .then((order) => {
      if (order.customer_id !== props.customer.id) {
        throw new HttpException(
          "Forbidden - Order does not belong to customer",
          403,
        );
      }
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const sortDir = props.body.order ?? ("desc" as const);
  // Build where clause
  const where = {
    order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.variantId !== undefined && {
      variant_id: props.body.variantId,
    }),
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.search !== undefined && {
      product: {
        name: { contains: props.body.search, mode: "insensitive" as const },
      },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const orderBy = (() => {
    const field = props.body.sort ?? "created_at";
    if (field === "status") {
      return { status: sortDir };
    }
    if (field === "seller_id") {
      return { seller_id: sortDir };
    }
    if (field === "price_at_purchase") {
      return { price_at_purchase: sortDir };
    }
    if (field === "quantity") {
      return { quantity: sortDir };
    }
    return { created_at: sortDir };
  })() satisfies Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput;
  // Query order items with pagination
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    orderItems,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
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
