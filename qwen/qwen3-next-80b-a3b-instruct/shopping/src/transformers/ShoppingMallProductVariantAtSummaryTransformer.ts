import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductImageAtSummaryTransformer } from "./ShoppingMallProductImageAtSummaryTransformer";

export namespace ShoppingMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            shopping_mall_product_images:
              ShoppingMallProductImageAtSummaryTransformer.select(),
          },
        },
        shopping_mall_product_variant_attributes: {
          select: {
            attributeValue: true,
          },
        },
        shopping_mall_product_variant_inventory: {
          select: {
            stockQuantity: true,
            allowBackorders: true,
          },
        },
        shopping_mall_product_variant_pricing: {
          select: {
            variantPrice: true,
          },
        },
        shopping_mall_variant_skus: {
          select: {
            sku: true,
          },
        },
        shopping_mall_variant_inventory: {
          select: {
            stockQuantity: true,
            allowBackorders: true,
          },
        },
        shopping_mall_variant_pricing: {
          select: {
            variantPrice: true,
          },
        },
        shopping_mall_variant_templates: true,
        shopping_mall_variant_audit_logs: true,
        shopping_mall_cart_items: true,
        shopping_mall_wishlist_items: true,
        shopping_mall_order_items: true,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant.ISummary> {
    // Combine stock quantity from both possible relations
    const stockQuantity =
      input.shopping_mall_product_variant_inventory?.stockQuantity ??
      input.shopping_mall_variant_inventory?.stockQuantity ??
      0;
    // Combine backorder enabled from both possible relations
    const allowBackorders =
      input.shopping_mall_product_variant_inventory?.allowBackorders ??
      input.shopping_mall_variant_inventory?.allowBackorders ??
      false;
    // Calculate availability status
    let availability_status:
      | "available"
      | "low_stock"
      | "out_of_stock"
      | "pre_order"
      | "backorder";
    if (stockQuantity > 0) {
      availability_status = stockQuantity >= 5 ? "available" : "low_stock";
    } else {
      availability_status = allowBackorders ? "backorder" : "out_of_stock";
    }
    // Transform variation_attributes: collect attribute values
    const variation_attributes = input.shopping_mall_product_variant_attributes
      .map((attr) => attr.attributeValue)
      .filter((value) => value !== null) as string[];
    // Transform name from concatenated attribute values
    const name =
      variation_attributes.length > 0 ? variation_attributes.join(", ") : "";
    // Get SKU
    const sku = input.shopping_mall_variant_skus?.sku || "";
    // Get price from either pricing relation
    const price = Number(
      input.shopping_mall_product_variant_pricing?.variantPrice ??
        input.shopping_mall_variant_pricing?.variantPrice ??
        0,
    );
    // Transform images using neighbor transformer
    const images = await ArrayUtil.asyncMap(
      input.product?.shopping_mall_product_images || [],
      ShoppingMallProductImageAtSummaryTransformer.transform,
    );
    return {
      id: input.id,
      sku,
      name,
      price,
      availability_status,
      variation_attributes,
      images,
      is_primary: false, // Default value since is_primary not in schema but required by DTO
      inventory_level: stockQuantity,
    };
  }
}
