import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function patchShoppingMallSellerSellersProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // Validate product exists and belongs to authenticated seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      is_deleted: false,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Validate category if provided
  if (props.body.shopping_mall_category_id !== undefined) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.shopping_mall_category_id },
    });
    if (category === null) {
      throw new HttpException("Category not found", 400);
    }
  }
  // Update product fields
  const updatedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      name: props.body.name ?? product.name,
      description: props.body.description ?? product.description,
      shopping_mall_category_id:
        props.body.shopping_mall_category_id ??
        product.shopping_mall_category_id,
      base_price: props.body.base_price ?? product.base_price,
    },
  });
  // Handle image ordering updates if provided
  if (
    props.body.product_images !== undefined &&
    props.body.product_images.length > 0
  ) {
    const sortedImages = [...props.body.product_images].sort(
      (a, b) => b.sort_order - a.sort_order,
    );
    for (const imageUpdate of sortedImages) {
      await MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: imageUpdate.image_id },
        data: {
          sort_order: imageUpdate.sort_order,
        },
      });
    }
  }
  // Fetch updated product data with separate relation queries
  const [seller, categoryData, images, variants] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: updatedProduct.shopping_mall_seller_id },
      select: {
        id: true,
        shop_name: true,
        approval_status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: updatedProduct.shopping_mall_category_id },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: updatedProduct.id },
      select: {
        id: true,
        image_url: true,
        sort_order: true,
      },
      orderBy: { sort_order: "asc" },
    }),
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: updatedProduct.id },
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
      },
    }),
  ]);
  if (seller === null || categoryData === null) {
    throw new HttpException("Failed to fetch updated product", 500);
  }
  // Transform to response DTO with proper string typing
  return {
    id: updatedProduct.id as string & tags.Format<"uuid">,
    name: updatedProduct.name,
    description: updatedProduct.description,
    base_price: updatedProduct.base_price,
    is_deleted: updatedProduct.is_deleted,
    category: {
      id: categoryData.id as string & tags.Format<"uuid">,
      name: categoryData.name,
      description: categoryData.description,
      parent: null,
      subcategory_count: 0,
    } satisfies IShoppingMallCategory.ISummary,
    seller: {
      id: seller.id as string & tags.Format<"uuid">,
      shop_name: seller.shop_name,
      approval_status: seller.approval_status,
      created_at: toISOStringSafe(seller.created_at),
    } satisfies IShoppingMallSeller.ISummary,
    images: images.map(
      (img) =>
        ({
          id: img.id as string & tags.Format<"uuid">,
          image_url: img.image_url,
          sort_order: img.sort_order,
        }) satisfies IShoppingMallProductImage,
    ),
    variants: await Promise.all(
      variants.map(async (variant) => ({
        id: variant.id as string & tags.Format<"uuid">,
        shoppingMallProductId: updatedProduct.id as string &
          tags.Format<"uuid">,
        skuCode: variant.sku_code,
        priceOverride: variant.price_override,
        stockQuantity: variant.stock_quantity,
        optionValues: [],
        product: {
          id: updatedProduct.id as string & tags.Format<"uuid">,
          name: updatedProduct.name,
          base_price: updatedProduct.base_price,
          is_deleted: updatedProduct.is_deleted,
          seller: {
            id: seller.id as string & tags.Format<"uuid">,
            shop_name: seller.shop_name,
            approval_status: seller.approval_status,
            created_at: toISOStringSafe(seller.created_at),
          } satisfies IShoppingMallSeller.ISummary,
          category: {
            id: categoryData.id as string & tags.Format<"uuid">,
            name: categoryData.name,
            description: categoryData.description,
            parent: null,
            subcategory_count: 0,
          } satisfies IShoppingMallCategory.ISummary,
          average_rating: 0,
        } satisfies IShoppingMallProduct.ISummary,
      })),
    ),
  };
}
