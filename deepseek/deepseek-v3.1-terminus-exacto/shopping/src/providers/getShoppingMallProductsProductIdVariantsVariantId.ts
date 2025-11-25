import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getShoppingMallProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
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

  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }

  return {
    id: variant.id,
    variant_name: variant.variant_name,
    sku: variant.sku,
    price: variant.price ?? undefined,
    stock_quantity: variant.stock_quantity,
    attributes: variant.attributes,
    active: variant.active,
    created_at: toISOStringSafe(variant.created_at),
    updated_at: toISOStringSafe(variant.updated_at),
    deleted_at: variant.deleted_at
      ? toISOStringSafe(variant.deleted_at)
      : undefined,
    product: {
      id: variant.product.id,
      name: variant.product.name,
      price: variant.product.price,
      status: variant.product.status,
      stock_quantity: variant.product.stock_quantity,
      category: {
        id: variant.product.category.id,
        name: variant.product.category.name,
        description: variant.product.category.description ?? undefined,
        display_order: variant.product.category.display_order,
        active: variant.product.category.active,
        parent_id:
          variant.product.category.parent_id ??
          "00000000-0000-0000-0000-000000000000",
        created_at: toISOStringSafe(variant.product.category.created_at),
        updated_at: toISOStringSafe(variant.product.category.updated_at),
        parent: variant.product.category.parent
          ? {
              id: variant.product.category.parent.id,
              name: variant.product.category.parent.name,
              description:
                variant.product.category.parent.description ?? undefined,
              display_order: variant.product.category.parent.display_order,
              active: variant.product.category.parent.active,
              parent_id:
                variant.product.category.parent.parent_id ??
                "00000000-0000-0000-0000-000000000000",
              created_at: toISOStringSafe(
                variant.product.category.parent.created_at,
              ),
              updated_at: toISOStringSafe(
                variant.product.category.parent.updated_at,
              ),
              parent: undefined,
            }
          : undefined,
      },
      seller: {
        id: variant.product.seller.id,
        business_name: variant.product.seller.business_name,
        contact_person: variant.product.seller.contact_person,
        email: variant.product.seller.email,
        status: variant.product.seller.status,
      },
    },
  };
}
