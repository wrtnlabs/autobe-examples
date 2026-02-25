import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postEcommerceSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IInventoryChange;
}): Promise<IEcommerceInventoryRecord.IInventoryStatus> {
  // First verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: {
      id: true,
      seller: {
        select: { id: true },
      },
    },
  });
  if (product.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: { id: true },
        },
      },
    });
  if (variant.product.id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to specified product",
      400,
    );
  }
  // Calculate current stock before operation
  const currentStockResult =
    await MyGlobal.prisma.ecommerce_inventory_records.aggregate({
      where: {
        variant: { id: props.variantId },
        deleted_at: null,
      },
      _sum: {
        quantity: true,
      },
    });
  const currentStock = currentStockResult._sum.quantity ?? 0;
  const newStock = currentStock + props.body.quantity;
  // Prevent negative stock
  if (newStock < 0) {
    throw new HttpException("Insufficient stock for this operation", 400);
  }
  // Create inventory record
  const now = new Date();
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_inventory_records.create({
      data: {
        id: v4(),
        variant: { connect: { id: props.variantId } },
        seller: { connect: { id: props.seller.id } },
        quantity: props.body.quantity,
        reason: props.body.reason,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Update variant quantity
  await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: {
      quantity: newStock,
      updated_at: now,
    },
  });
  // Get complete variant details for response
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku: true,
        option_values: true,
        price_override: true,
        quantity: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                shop_description: true,
                logo_image_url: true,
                account_status: true,
                created_at: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    created_at: true,
                  },
                },
                created_at: true,
              },
            },
          },
        },
      },
    });
  return {
    current_stock: newStock,
    variant_id: props.variantId,
    operation_quantity: props.body.quantity,
    operation_reason: props.body.reason,
    variant: {
      id: updatedVariant.id,
      sku: updatedVariant.sku,
      option_values: updatedVariant.option_values,
      price_override: updatedVariant.price_override,
      quantity: updatedVariant.quantity,
      product: {
        id: updatedVariant.product.id,
        name: updatedVariant.product.name,
        base_price: updatedVariant.product.base_price,
        seller: {
          id: updatedVariant.product.seller.id,
          email: updatedVariant.product.seller.email,
          shop_name: updatedVariant.product.seller.shop_name,
          shop_description: updatedVariant.product.seller.shop_description,
          logo_image_url: updatedVariant.product.seller.logo_image_url,
          account_status: updatedVariant.product.seller.account_status,
          created_at: toISOStringSafe(updatedVariant.product.seller.created_at),
        } satisfies IEcommerceSeller.ISummary,
        category: {
          id: updatedVariant.product.category.id,
          name: updatedVariant.product.category.name,
          parent: updatedVariant.product.category.parent
            ? {
                id: updatedVariant.product.category.parent.id,
                name: updatedVariant.product.category.parent.name,
                created_at: toISOStringSafe(
                  updatedVariant.product.category.parent.created_at,
                ),
                products_count: 0,
                parent: null,
              }
            : null,
          created_at: toISOStringSafe(
            updatedVariant.product.category.created_at,
          ),
          products_count: 0,
        } satisfies IEcommerceCategory.ISummary,
      } satisfies IEcommerceProduct.ISummary,
    } satisfies IEcommerceProductVariant.ISummary,
  };
}
