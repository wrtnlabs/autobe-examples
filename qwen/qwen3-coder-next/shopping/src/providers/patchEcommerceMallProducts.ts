import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProducts(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    is_available: true,
    deleted_at: null,
    seller: {
      is_suspended: false,
    },
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.category_id && {
      category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: { gt: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lt: props.body.max_price },
    }),
    ...(props.body.in_stock === true && {
      variants: {
        some: {
          stock_quantity: { gt: 0 },
          deleted_at: null,
        },
      },
    }),
  };
  // Build order by clause
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "base_price_asc"
      ? { base_price: "asc" }
      : props.body.sort === "base_price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  // Fetch products with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        base_price: true,
        is_available: true,
        created_at: true,
        seller: {
          select: { id: true, shop_name: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where }),
  ]);
  // Transform to response format
  const transformedData: IEcommerceMallCustomer.ISummary[] = data.map(
    (product) => ({
      id: product.id,
      email: "", // Placeholder - should be retrieved from seller or customer
      is_suspended: false, // Placeholder
      created_at: product.created_at.toISOString() as string &
        tags.Format<"date-time">,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
