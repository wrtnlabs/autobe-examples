import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Verify the variant exists and belongs to the product
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

  if (!existingVariant) {
    throw new HttpException("Variant not found", 404);
  }

  // Check SKU uniqueness if SKU is being updated
  if (props.body.sku !== undefined && props.body.sku !== null) {
    const existingSku =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku: props.body.sku,
          shopping_mall_product_id: props.productId,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });

    if (existingSku) {
      throw new HttpException("SKU must be unique within the product", 400);
    }
  }

  // Perform the update with inline parameter construction
  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      updated_at: toISOStringSafe(new Date()),
      ...(props.body.variant_name !== undefined &&
        props.body.variant_name !== null && {
          variant_name: props.body.variant_name,
        }),
      ...(props.body.sku !== undefined &&
        props.body.sku !== null && { sku: props.body.sku }),
      ...(props.body.price !== undefined &&
        props.body.price !== null && { price: props.body.price }),
      ...(props.body.stock_quantity !== undefined &&
        props.body.stock_quantity !== null && {
          stock_quantity: props.body.stock_quantity,
        }),
      ...(props.body.attributes !== undefined &&
        props.body.attributes !== null && {
          attributes: props.body.attributes,
        }),
      ...(props.body.active !== undefined &&
        props.body.active !== null && { active: props.body.active }),
    },
  });

  // Fetch the complete variant with product relationship
  const variantWithProduct =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: { id: props.variantId },
      include: {
        product: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
            seller: true,
          },
        },
      },
    });

  if (!variantWithProduct) {
    throw new HttpException("Variant not found after update", 404);
  }

  // Convert to API response format with proper null/undefined handling
  return {
    id: variantWithProduct.id,
    variant_name: variantWithProduct.variant_name,
    sku: variantWithProduct.sku,
    price:
      variantWithProduct.price === null ? undefined : variantWithProduct.price,
    stock_quantity: variantWithProduct.stock_quantity,
    attributes: variantWithProduct.attributes,
    active: variantWithProduct.active,
    created_at: toISOStringSafe(variantWithProduct.created_at),
    updated_at: toISOStringSafe(variantWithProduct.updated_at),
    deleted_at: variantWithProduct.deleted_at
      ? toISOStringSafe(variantWithProduct.deleted_at)
      : undefined,
    product: variantWithProduct.product
      ? {
          id: variantWithProduct.product.id,
          name: variantWithProduct.product.name,
          price: variantWithProduct.product.price,
          status: variantWithProduct.product.status,
          stock_quantity: variantWithProduct.product.stock_quantity,
          category: {
            id: variantWithProduct.product.category.id,
            name: variantWithProduct.product.category.name,
            description:
              variantWithProduct.product.category.description ?? undefined,
            display_order: variantWithProduct.product.category.display_order,
            active: variantWithProduct.product.category.active,
            parent_id:
              variantWithProduct.product.category.parent_id !== null
                ? (variantWithProduct.product.category
                    .parent_id satisfies string as string)
                : ("" satisfies string as string),
            created_at: toISOStringSafe(
              variantWithProduct.product.category.created_at,
            ),
            updated_at: toISOStringSafe(
              variantWithProduct.product.category.updated_at,
            ),
            parent: variantWithProduct.product.category.parent
              ? {
                  id: variantWithProduct.product.category.parent.id,
                  name: variantWithProduct.product.category.parent.name,
                  description:
                    variantWithProduct.product.category.parent.description ??
                    undefined,
                  display_order:
                    variantWithProduct.product.category.parent.display_order,
                  active: variantWithProduct.product.category.parent.active,
                  parent_id:
                    variantWithProduct.product.category.parent.parent_id !==
                    null
                      ? (variantWithProduct.product.category.parent
                          .parent_id satisfies string as string)
                      : ("" satisfies string as string),
                  created_at: toISOStringSafe(
                    variantWithProduct.product.category.parent.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    variantWithProduct.product.category.parent.updated_at,
                  ),
                  parent: undefined, // Avoid infinite recursion
                }
              : undefined,
          },
          seller: {
            id: variantWithProduct.product.seller.id,
            business_name: variantWithProduct.product.seller.business_name,
            contact_person: variantWithProduct.product.seller.contact_person,
            email: variantWithProduct.product.seller.email,
            status: variantWithProduct.product.seller.status,
          },
        }
      : undefined,
  };
}
