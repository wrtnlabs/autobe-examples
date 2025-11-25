import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdAttributes(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.IRequest;
}): Promise<IPageIShoppingMallProductAttribute.ISummary> {
  const { productId, body } = props;
  // Retrieve product (including seller and categories)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId, deleted_at: null },
    include: {
      seller: true,
      shopping_mall_products_categories: {
        include: {
          category: true,
        },
      },
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build filter
  const filters: Record<string, any> = {
    shopping_mall_product_id: productId,
    deleted_at: null,
  };
  if (typeof body.search === "string" && body.search) {
    filters.attribute_name = { contains: body.search, mode: "insensitive" };
  }
  if (typeof body.position === "number") {
    filters.position = body.position;
  }
  // Sorting
  let orderBy: any = { position: "asc" };
  if (body.sort === "attribute_name") {
    orderBy = { attribute_name: "asc" };
  } else if (body.sort === "position") {
    orderBy = { position: "asc" };
  }

  // Query attributes
  const [attributes, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_attributes.findMany({
      where: filters,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_attributes.count({
      where: filters,
    }),
  ]);

  // Build product, seller, categories summaries for ISummary
  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: {
      id: product.seller.id,
      business_name: product.seller.business_name,
    },
    categories: product.shopping_mall_products_categories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
    })),
    created_at: toISOStringSafe(product.created_at),
  };

  const data = attributes.map((attr) => ({
    id: attr.id,
    product: productSummary,
    attribute_name: attr.attribute_name,
    position: attr.position,
    created_at: toISOStringSafe(attr.created_at),
    updated_at: toISOStringSafe(attr.updated_at),
    deleted_at: attr.deleted_at ? toISOStringSafe(attr.deleted_at) : null,
  }));

  const pagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data,
  };
}
