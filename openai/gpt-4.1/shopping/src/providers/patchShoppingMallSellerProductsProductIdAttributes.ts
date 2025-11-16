import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdAttributes(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.IRequest;
}): Promise<IPageIShoppingMallProductAttribute.ISummary> {
  // 1. Ownership authorization
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
    include: {
      seller: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  // 2. Fetch categories separately
  const productCategories =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: props.productId },
      include: { category: true },
    });
  const categorySummaries = productCategories.map((x: any) => ({
    id: x.category.id,
    name: x.category.name,
  }));

  // 3. Filters
  const filters: Record<string, unknown> = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
  };
  if (typeof props.body.search === "string" && props.body.search.length > 0) {
    filters.attribute_name = { contains: props.body.search };
  }
  if (typeof props.body.position === "number") {
    filters.position = props.body.position;
  }

  // 4. Sorting
  let orderBy = { position: "asc" } as const;
  if (typeof props.body.sort === "string") {
    if (props.body.sort === "attribute_name") {
      orderBy = { attribute_name: "asc" } as any;
    } else if (props.body.sort === "-attribute_name") {
      orderBy = { attribute_name: "desc" } as any;
    } else if (props.body.sort === "-position") {
      orderBy = { position: "desc" } as any;
    }
  }

  // 5. Pagination
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 10;
  const skip = (page - 1) * limit;

  // 6. Data and total
  const [attributes, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_attributes.findMany({
      where: filters,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_attributes.count({ where: filters }),
  ]);

  // 7. Response mapping
  const sellerSummary = {
    id: (product as any).seller.id,
    business_name: (product as any).seller.business_name,
  };
  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: sellerSummary,
    categories: categorySummaries,
    created_at: toISOStringSafe(product.created_at),
  };
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: attributes.map((a) => ({
      id: a.id,
      product: productSummary,
      attribute_name: a.attribute_name,
      position: a.position,
      created_at: toISOStringSafe(a.created_at),
      updated_at: toISOStringSafe(a.updated_at),
      deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : null,
    })),
  };
}
