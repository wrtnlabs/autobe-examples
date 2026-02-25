import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct.IInvert> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        is_deleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        is_deleted: true,
        deleted_at: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
      },
    },
  );
  // Fetch related seller data
  const sellerData =
    await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
      where: { id: product.shopping_mall_seller_id },
      select: {
        id: true,
        shop_name: true,
        approval_status: true,
        created_at: true,
      },
    });
  // Fetch related category data
  const categoryData =
    await MyGlobal.prisma.shopping_mall_categories.findFirstOrThrow({
      where: { id: product.shopping_mall_category_id },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
      },
    });
  const parentCategory = categoryData.parent_category_id
    ? {
        id: categoryData.parent_category_id,
        name: "",
        description: null,
        parent: null,
        subcategory_count: 0,
      }
    : null;
  const category: IShoppingMallCategory.ISummary = {
    id: categoryData.id,
    name: categoryData.name,
    description: categoryData.description,
    parent: parentCategory,
    subcategory_count: 0,
  };
  // Fetch product images
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: { shopping_mall_product_id: product.id },
    select: {
      id: true,
      image_url: true,
      sort_order: true,
    },
    orderBy: { sort_order: "asc" },
  });
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    is_deleted: product.is_deleted,
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
    seller: {
      id: sellerData.id,
      shop_name: sellerData.shop_name,
      approval_status: sellerData.approval_status,
      created_at: sellerData.created_at.toISOString(),
    },
    category,
  };
}
