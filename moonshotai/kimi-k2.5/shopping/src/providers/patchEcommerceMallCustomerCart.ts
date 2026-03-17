import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemAtSummaryTransformer } from "../transformers/EcommerceMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  // Build base where clause with customer filter and soft delete check
  const baseWhere: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
  };
  // Apply variant_id filter if provided
  if (props.body.variant_id !== null) {
    baseWhere.product_variant_id = props.body.variant_id;
  }
  // Apply min_quantity filter if provided
  if (props.body.min_quantity !== null) {
    baseWhere.quantity = { gte: props.body.min_quantity };
  }
  // Build variant-level filters for joins
  const variantWhere: Prisma.ecommerce_mall_product_variantsWhereInput = {};
  // For available filter, exclude deleted variants
  if (props.body.availability_status === "available") {
    variantWhere.deleted_at = null;
  }
  if (props.body.product_id !== null) {
    variantWhere.product_id = props.body.product_id;
  }
  if (props.body.search !== null) {
    variantWhere.product = {
      name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    };
  }
  // Combine where conditions
  const whereInput: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    ...baseWhere,
    ...(Object.keys(variantWhere).length > 0 && {
      productVariant: variantWhere,
    }),
  };
  // Cursor-based pagination: find items with created_at less than the cursor item's created_at
  let finalWhere = whereInput;
  const limit = props.body.limit;
  if (props.body.cursor !== null) {
    // Get the cursor item to find its created_at
    const cursorItem =
      await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
        where: { id: props.body.cursor },
        select: { created_at: true },
      });
    if (cursorItem !== null) {
      finalWhere = {
        ...whereInput,
        created_at: { lt: cursorItem.created_at },
      };
    }
  }
  // Calculate skip for page-based pagination
  const skip =
    props.body.cursor === null &&
    props.body.page !== undefined &&
    props.body.page !== null
      ? (props.body.page - 1) * limit
      : undefined;
  // Fetch cart items with joins using transformer select
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: finalWhere,
    orderBy: { created_at: "desc" as const },
    skip,
    take: limit,
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  // Transform to response DTOs
  let transformedItems = await ArrayUtil.asyncMap(
    cartItems,
    EcommerceMallCartItemAtSummaryTransformer.transform,
  );
  // Apply availability_status filter post-transformation for unavailable items
  // (requires stock calculation which is done in transformer)
  if (props.body.availability_status === "unavailable") {
    transformedItems = transformedItems.filter((item) => !item.isAvailable);
  }
  // Get total count for pagination (using base where without cursor/pagination)
  const totalCount = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: whereInput,
  });
  // Calculate current page
  const currentPage =
    props.body.cursor !== null
      ? 1 // Cursor-based pagination doesn't have meaningful page numbers
      : (props.body.page ?? 1);
  return {
    data: transformedItems,
    pagination: {
      current: currentPage,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
