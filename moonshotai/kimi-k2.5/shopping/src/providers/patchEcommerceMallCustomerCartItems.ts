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

export async function patchEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  const limit = props.body.limit;
  const cursor = props.body.cursor;
  const page = (props.body.page ?? 1) satisfies number as number;
  const whereConditions: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
  };
  if (props.body.variant_id !== null) {
    whereConditions.product_variant_id = props.body.variant_id;
  }
  if (props.body.min_quantity !== null) {
    whereConditions.quantity = { gte: props.body.min_quantity };
  }
  const variantFilters: Prisma.ecommerce_mall_product_variantsWhereInput = {};
  if (props.body.product_id !== null) {
    variantFilters.product_id = props.body.product_id;
  }
  if (props.body.search !== null) {
    variantFilters.product = {
      name: { contains: props.body.search, mode: "insensitive" as const },
    };
  }
  if (Object.keys(variantFilters).length > 0) {
    whereConditions.productVariant = variantFilters;
  }
  const totalCount = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: whereConditions,
  });
  const queryArgs = {
    where: whereConditions,
    orderBy: { created_at: "desc" as const },
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
    ...(cursor !== null
      ? {
          cursor: { id: cursor },
          skip: 1,
          take: limit + 1,
        }
      : {
          skip: (page - 1) * limit,
          take: limit + 1,
        }),
  };
  const data =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findMany(queryArgs);
  const hasMore = data.length > limit;
  const cartItems = hasMore ? data.slice(0, limit) : data;
  const transformedItems = await ArrayUtil.asyncMap(
    cartItems,
    EcommerceMallCartItemAtSummaryTransformer.transform,
  );
  let filteredItems = transformedItems;
  if (
    props.body.availability_status !== null &&
    props.body.availability_status !== "all"
  ) {
    filteredItems = transformedItems.filter((item) =>
      props.body.availability_status === "available"
        ? item.isAvailable
        : !item.isAvailable,
    );
  }
  return {
    data: filteredItems,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
