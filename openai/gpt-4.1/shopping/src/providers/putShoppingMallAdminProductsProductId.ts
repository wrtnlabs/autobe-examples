import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or deleted", 404);
  }

  const dataToUpdate: Record<string, unknown> = {
    ...("title" in props.body ? { title: props.body.title } : {}),
    ...("description" in props.body
      ? { description: props.body.description }
      : {}),
    ...("default_price" in props.body
      ? { default_price: props.body.default_price }
      : {}),
    ...("business_status" in props.body
      ? { business_status: props.body.business_status }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: dataToUpdate,
  });

  // Fetch seller summary
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: updated.shopping_mall_seller_id },
  });
  if (!seller) {
    throw new HttpException("Seller not found for product", 500);
  }
  const sellerSummary = {
    id: seller.id,
    business_name: seller.business_name,
  };

  // Fetch categories from join table, then load their ISummary records
  const productCategoryMappings =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: updated.id },
      select: { shopping_mall_category_id: true },
    });
  const categoryIds = productCategoryMappings.map(
    (m) => m.shopping_mall_category_id,
  );
  let primary_categories: IShoppingMallCategory.ISummary[] = [];
  if (categoryIds.length > 0) {
    const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: { id: { in: categoryIds } },
    });
    primary_categories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id ?? undefined,
      description: cat.description,
      status: cat.status,
      sort_order: cat.sort_order,
      updated_at: toISOStringSafe(cat.updated_at),
      deleted_at:
        cat.deleted_at !== null ? toISOStringSafe(cat.deleted_at) : undefined,
    }));
  }

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    default_price: updated.default_price,
    business_status: updated.business_status,
    seller: sellerSummary,
    primary_categories,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
