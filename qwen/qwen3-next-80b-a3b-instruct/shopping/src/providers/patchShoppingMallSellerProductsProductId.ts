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
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProduct.IRequest;
}): Promise<IShoppingMallProduct> {
  const { seller, productId, body } = props;
  // Validate seller status is approved
  const sellerRecord =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: seller.id, status: "approved", deleted_at: null },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: productId, seller_id: seller.id, deleted_at: null },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
        orderItems: { select: { status: true } },
      },
    });
  // Validate category exists and is not deleted
  if (body.category_id !== undefined) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: { id: body.category_id, deleted_at: null },
    });
    if (category === null) {
      throw new HttpException("Category not found or inactive", 400);
    }
  }
  // Check seller has not exceeded 1,000 active products limit before update
  const activeProductCount = await MyGlobal.prisma.shopping_mall_products.count(
    {
      where: { seller_id: seller.id, deleted_at: null },
    },
  );
  if (activeProductCount >= 1000) {
    throw new HttpException(
      "Seller cannot have more than 1,000 active products",
      400,
    );
  }
  // Validate name and description length from analysis
  if (body.name !== undefined) {
    if (body.name.length < 3 || body.name.length > 200) {
      throw new HttpException("Product name must be 3-200 characters", 400);
    }
  }
  if (body.description !== undefined) {
    if (body.description.length < 10 || body.description.length > 5000) {
      throw new HttpException(
        "Product description must be 10-5000 characters",
        400,
      );
    }
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Handle images
    if (body.images !== undefined) {
      for (const image of body.images) {
        if (image.id) {
          // Update existing image or mark deleted
          const existingImage =
            await tx.shopping_mall_product_images.findUnique({
              where: { id: image.id, product_id: productId },
            });
          if (existingImage) {
            const isInRequest = body.images.some((img) => img.id === image.id);
            await tx.shopping_mall_product_images.update({
              where: { id: image.id },
              data: {
                position:
                  image.position !== undefined
                    ? image.position
                    : existingImage.position,
                deleted_at: isInRequest ? null : toISOStringSafe(new Date()),
                image_url:
                  image.image_url !== undefined
                    ? image.image_url
                    : existingImage.image_url,
              },
            });
          }
        } else if (image.image_url) {
          // Create new image
          const maxPosition = await tx.shopping_mall_product_images.aggregate({
            _max: { position: true },
            where: { product_id: productId, deleted_at: null },
          });
          await tx.shopping_mall_product_images.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              product_id: productId,
              image_url: image.image_url,
              position: (maxPosition._max.position ?? -1) + 1,
              created_at: toISOStringSafe(new Date()),
              deleted_at: null,
            },
          });
        }
      }
    }
    // Handle variants
    if (body.variants !== undefined) {
      const existingVariantIds = new Set(product.variants.map((v) => v.id));
      const requestVariantIds = new Set(
        body.variants.filter((v) => v.id).map((v) => v.id),
      );
      // Delete variants not in request
      for (const variantId of Array.from(existingVariantIds)) {
        if (!requestVariantIds.has(variantId)) {
          // Check for active order items in 'paid' or 'shipped' status
          const hasActiveOrderItems = await tx.shopping_mall_order_items.count({
            where: {
              variant: { id: variantId },
              status: { in: ["paid", "shipped"] },
            },
          });
          if (hasActiveOrderItems > 0) {
            throw new HttpException(
              "Cannot delete variant with active order items in paid or shipped status",
              400,
            );
          }
          // Soft delete variant
          await tx.shopping_mall_product_variants.update({
            where: { id: variantId },
            data: {
              deleted_at: toISOStringSafe(new Date()),
            },
          });
        }
      }
      // Update or create variants
      for (const variant of body.variants) {
        if (variant.id) {
          // Update existing variant
          const existingVariant =
            await tx.shopping_mall_product_variants.findUnique({
              where: { id: variant.id },
            });
          if (existingVariant) {
            // Create snapshot
            const version =
              (await tx.shopping_mall_product_variant_snapshots.count({
                where: { product_variant_id: variant.id },
              })) + 1;
            await tx.shopping_mall_product_variant_snapshots.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                product_variant_id: variant.id,
                sku_code: existingVariant.sku_code,
                price: existingVariant.price,
                changed_by: seller.id,
                version,
                changed_at: toISOStringSafe(new Date()),
                created_at: toISOStringSafe(existingVariant.created_at),
                updated_at: toISOStringSafe(existingVariant.updated_at),
              },
            });
            // Update variant
            await tx.shopping_mall_product_variants.update({
              where: { id: variant.id },
              data: {
                sku_code:
                  variant.sku_code !== undefined
                    ? variant.sku_code
                    : existingVariant.sku_code,
                price:
                  variant.price !== undefined
                    ? variant.price
                    : existingVariant.price,
                updated_at: toISOStringSafe(new Date()),
              },
            });
          }
        } else if (variant.sku_code) {
          // Create new variant
          await tx.shopping_mall_product_variants.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              product_id: productId,
              sku_code: variant.sku_code,
              price: variant.price,
              stock_quantity: variant.stock_quantity ?? 0,
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
              deleted_at: null,
            },
          });
        }
      }
    }
    // Update product
    const updatedProduct = await tx.shopping_mall_products.update({
      where: { id: productId },
      data: {
        name: body.name !== undefined ? body.name : product.name,
        description:
          body.description !== undefined
            ? body.description
            : product.description,
        category_id:
          body.category_id !== undefined
            ? body.category_id
            : product.category_id,
        base_price:
          body.base_price !== undefined ? body.base_price : product.base_price,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Create product snapshot
    const version =
      (await tx.shopping_mall_product_snapshots.count({
        where: { product_id: productId },
      })) + 1;
    // Fetch category and seller data separately for snapshot to avoid Prisma type issues
    const snapshotCategory = await tx.shopping_mall_categories.findUnique({
      where: { id: updatedProduct.category_id },
    });
    // Fetch images and variants for snapshot
    const snapshotImages = await tx.shopping_mall_product_images.findMany({
      where: { product_id: productId, deleted_at: null },
      orderBy: { position: "asc" },
    });
    const snapshotVariants = await tx.shopping_mall_product_variants.findMany({
      where: { product_id: productId, deleted_at: null },
    });
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: productId,
        category_id: updatedProduct.category_id,
        changed_by_id: seller.id,
        version,
        changed_at: toISOStringSafe(new Date()),
        name: updatedProduct.name,
        description: updatedProduct.description,
        base_price: updatedProduct.base_price,
        created_at: toISOStringSafe(updatedProduct.created_at),
        updated_at: toISOStringSafe(updatedProduct.updated_at),
        deleted_at: updatedProduct.deleted_at
          ? toISOStringSafe(updatedProduct.deleted_at)
          : null,
      },
    });
    // Return updated product
    const finalProduct = await tx.shopping_mall_products.findUnique({
      where: { id: productId },
      include: ShoppingMallProductTransformer.select().select,
    });
    if (!finalProduct) throw new HttpException("Product not found", 404);
    return ShoppingMallProductTransformer.transform(finalProduct);
  });
}
