import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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

export async function putShoppingMallSellerSellersProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Validate product ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      shopping_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  // Validate variant ownership and existence
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted: false,
      },
    });
  if (!existingVariant) {
    throw new HttpException(
      "Variant not found or does not belong to product",
      404,
    );
  }
  // Validate SKU uniqueness if being updated
  if (props.body.skuCode !== undefined) {
    const duplicateVariant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          id: {
            not: props.variantId,
          },
          deleted: false,
        },
      });
    if (duplicateVariant) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  // Update in transaction: delete old options, create new options, update variant
  const updatedVariant = await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing options if optionValues are being updated
    if (props.body.optionValues !== undefined) {
      await tx.shopping_mall_product_variant_options.deleteMany({
        where: {
          shopping_mall_product_variant_id: props.variantId,
        },
      });
      // Create new options
      const optionEntries = Object.entries(props.body.optionValues);
      if (optionEntries.length > 0) {
        await tx.shopping_mall_product_variant_options.createMany({
          data: optionEntries.map(([key, value]) => ({
            id: v4(),
            shopping_mall_product_variant_id: props.variantId,
            key,
            value,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        });
      }
    }
    // Update variant record
    return tx.shopping_mall_product_variants.update({
      where: {
        id: props.variantId,
      },
      data: {
        ...(props.body.skuCode !== undefined && {
          sku_code: props.body.skuCode,
        }),
        ...(props.body.price !== undefined && {
          price: props.body.price ?? null,
        }),
        ...(props.body.stockQuantity !== undefined && {
          stock_quantity: props.body.stockQuantity,
        }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            shopping_seller_id: true,
            shopping_category_id: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                shop_description: true,
                logo_image_url: true,
                approval_status: true,
                suspended: true,
                created_at: true,
                approved_by_admin_id: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_category_id: true,
                created_at: true,
              },
            },
            images: {
              select: {
                id: true,
                image_url: true,
                display_order: true,
                created_at: true,
              },
              orderBy: {
                display_order: "asc",
              },
            },
            variants: {
              where: {
                deleted: false,
              },
              select: {
                id: true,
                sku_code: true,
                price: true,
                stock_quantity: true,
                deleted: true,
                created_at: true,
                options: {
                  select: {
                    id: true,
                    key: true,
                    value: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
          },
        },
        options: {
          select: {
            id: true,
            key: true,
            value: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  });
  return {
    id: updatedVariant.id,
    skuCode: updatedVariant.sku_code,
    price: updatedVariant.price ?? undefined,
    stockQuantity: updatedVariant.stock_quantity,
    product: {
      id: updatedVariant.product.id,
      name: updatedVariant.product.name,
      basePrice: updatedVariant.product.base_price,
      seller: {
        id: updatedVariant.product.seller.id,
        email: updatedVariant.product.seller.email,
        shop_name: updatedVariant.product.seller.shop_name,
        shop_description: updatedVariant.product.seller.shop_description,
        logo_image_url: updatedVariant.product.seller.logo_image_url,
        approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
          updatedVariant.product.seller.approval_status,
        ),
        suspended: updatedVariant.product.seller.suspended,
        created_at: toISOStringSafe(updatedVariant.product.seller.created_at),
        approvedByAdmin: updatedVariant.product.seller.approved_by_admin_id
          ? {
              id: updatedVariant.product.seller.approved_by_admin_id,
              email: "",
              grade: "",
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
              deleted_at: null,
            }
          : null,
      },
      category: {
        id: updatedVariant.product.category.id,
        name: updatedVariant.product.category.name,
        description: updatedVariant.product.category.description ?? undefined,
        parent: updatedVariant.product.category.parent_category_id
          ? {
              id: updatedVariant.product.category.parent_category_id,
              name: "",
              description: null,
              parent: null,
              created_at: toISOStringSafe(new Date()),
            }
          : null,
        created_at: toISOStringSafe(updatedVariant.product.category.created_at),
      },
      mainImage:
        updatedVariant.product.images.length > 0
          ? {
              id: updatedVariant.product.images[0].id,
              imageUrl: updatedVariant.product.images[0].image_url,
              displayOrder: updatedVariant.product.images[0].display_order,
              createdAt: toISOStringSafe(
                updatedVariant.product.images[0].created_at,
              ),
            }
          : null,
      variantCount: updatedVariant.product.variants.length,
      averageRating: null,
      reviewCount: 0,
      createdAt: toISOStringSafe(updatedVariant.product.created_at),
    },
    options: updatedVariant.options.map((opt) => ({
      id: opt.id,
      key: opt.key,
      value: opt.value,
      variant: {
        id: updatedVariant.id,
        skuCode: updatedVariant.sku_code,
        optionValues: updatedVariant.options.map((o) => ({
          id: o.id,
          key: o.key,
          value: o.value,
          variant: {
            id: updatedVariant.id,
            skuCode: updatedVariant.sku_code,
            optionValues: [],
            price: updatedVariant.price ?? undefined,
            stockQuantity: updatedVariant.stock_quantity,
          },
          created_at: toISOStringSafe(o.created_at),
          updated_at: toISOStringSafe(o.updated_at),
        })),
        price: updatedVariant.price ?? undefined,
        stockQuantity: updatedVariant.stock_quantity,
      },
      created_at: toISOStringSafe(opt.created_at),
      updated_at: toISOStringSafe(opt.updated_at),
    })),
    createdAt: toISOStringSafe(updatedVariant.created_at),
    updatedAt: toISOStringSafe(updatedVariant.updated_at),
    deletedAt: updatedVariant.deleted_at
      ? toISOStringSafe(updatedVariant.deleted_at)
      : null,
  };
}
