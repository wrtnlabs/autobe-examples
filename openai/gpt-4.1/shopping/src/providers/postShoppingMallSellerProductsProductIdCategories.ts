import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdCategories(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductsCategory.ICreate;
}): Promise<IShoppingMallProductsCategory> {
  // 1. Verify product ownership and existence.
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Product not found, deleted, or you do not have permission to modify.",
      404,
    );
  }
  // 2. Verify category existence.
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: props.body.shopping_mall_category_id,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found or has been deleted.", 404);
  }
  // 3. Check uniqueness (no duplicate mapping).
  const existingMapping =
    await MyGlobal.prisma.shopping_mall_products_categories.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        shopping_mall_category_id: props.body.shopping_mall_category_id,
      },
    });
  if (existingMapping) {
    throw new HttpException(
      "This category is already assigned to the product.",
      409,
    );
  }
  // 4. Insert new product-category mapping.
  const now = toISOStringSafe(new Date());
  const mapping =
    await MyGlobal.prisma.shopping_mall_products_categories.create({
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        shopping_mall_category_id: props.body.shopping_mall_category_id,
        created_at: now,
      },
    });
  // 5. Build the list of all categories for this product and their summaries.
  const allMappings =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: props.productId },
      include: { category: true },
    });
  const categorySummaries = allMappings.map((m) => {
    const c = m.category;
    return {
      id: c.id,
      name: c.name,
      parent_id: c.parent_id ?? undefined,
      description: c.description,
      status: c.status,
      sort_order: c.sort_order,
      updated_at: toISOStringSafe(c.updated_at),
      deleted_at: c.deleted_at ? toISOStringSafe(c.deleted_at) : undefined,
    };
  });

  // 6. Compose seller summary
  const sellerEntity = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
  });
  const sellerSummary = {
    id: props.seller.id,
    business_name: sellerEntity?.business_name ?? "",
  };

  // 7. Compose product summary
  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: sellerSummary,
    categories: categorySummaries,
    created_at: toISOStringSafe(product.created_at),
  };

  // 8. Compose assigned category summary
  const cat: typeof category = category;
  const categorySummary = {
    id: cat.id,
    name: cat.name,
    parent_id: cat.parent_id ?? undefined,
    description: cat.description,
    status: cat.status,
    sort_order: cat.sort_order,
    updated_at: toISOStringSafe(cat.updated_at),
    deleted_at: cat.deleted_at ? toISOStringSafe(cat.deleted_at) : undefined,
  };

  // 9. Return mapping entity, all types and fields matched to DTO (including date conversions)
  return {
    id: mapping.id,
    product: productSummary,
    category: categorySummary,
    created_at: now,
  };
}
