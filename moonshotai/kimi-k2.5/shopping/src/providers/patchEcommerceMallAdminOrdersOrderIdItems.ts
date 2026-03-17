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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify order exists
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause with type safety
  const where: Prisma.ecommerce_mall_order_itemsWhereInput = {
    order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.variantId !== undefined && {
      variant_id: props.body.variantId,
    }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.search !== undefined && {
      product: {
        name: { contains: props.body.search, mode: "insensitive" },
      },
    }),
  };
  // Determine order by with proper typing
  const sortField = props.body.sort ?? "created_at";
  const sortOrder =
    props.body.order ?? (sortField === "created_at" ? "desc" : "asc");
  const orderByMap: Record<
    string,
    Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput
  > = {
    created_at: { created_at: sortOrder },
    status: { status: sortOrder },
    seller_id: { seller_id: sortOrder },
    price_at_purchase: { price_at_purchase: sortOrder },
    quantity: { quantity: sortOrder },
  };
  const orderBy = orderByMap[sortField] ?? {
    created_at: sortOrder as "asc" | "desc",
  };
  // Fetch items with count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({ where }),
  ]);
  // Transform results
  const data = await ArrayUtil.asyncMap(
    items,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
