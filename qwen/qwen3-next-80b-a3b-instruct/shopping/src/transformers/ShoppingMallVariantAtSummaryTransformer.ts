import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariant";
import { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { IShoppingMallLocationZone } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLocationZone";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallVariantAttributeAtSummaryTransformer } from "./ShoppingMallVariantAttributeAtSummaryTransformer";
import { ShoppingMallProductBrandAtSummaryTransformer } from "./ShoppingMallProductBrandAtSummaryTransformer";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallVariantAtSummaryTransformer {
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
        // Product relation - for product_id, product_name
        product: ShoppingMallProductAtSummaryTransformer.select(),
        // Variant attributes for variant_attributes and available_options_count
        shopping_mall_product_variant_attributes:
          ShoppingMallVariantAttributeAtSummaryTransformer.select(),
        // Variant inventory for inventory_quantity, is_published, location_zones, production_status, visibility_score
        shopping_mall_product_variant_inventory: {
          select: {
            quantity: true,
            is_published: true,
            location_zones: true,
            production_status: true,
            visibility_score: true,
          },
        },
        // Variant pricing for price, currency
        shopping_mall_product_variant_pricing: {
          select: {
            price: true,
            currency: true,
          },
        },
        // SKU
        shopping_mall_variant_skus: {
          select: {
            sku: true,
          },
        },
        // Audit logs for reviews_count, average_rating, compliance_status
        shopping_mall_variant_audit_logs: {
          select: {
            rating: true,
            compliance_status: true,
          },
        },
        // Cart items for reserved_quantity (count)
        shopping_mall_cart_items: {
          select: {
            id: true,
          },
        },
        // Wishlist items for reserved_quantity (alternative)
        shopping_mall_wishlist_items: {
          select: {
            id: true,
          },
        },
        // Order items for sales_count (count)
        shopping_mall_order_items: {
          select: {
            id: true,
          },
        },
        // Templates for variant_tagged, seo_title, seo_description, variant_type
        shopping_mall_variant_templates: {
          select: {
            tag: true,
            seo_title: true,
            seo_description: true,
            variant_type: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariant.ISummary> {
    return {
      id: input.id,
      sku: input.shopping_mall_variant_skus?.sku ?? "",
      name: input.product.name,
      description: input.product.description ?? undefined,
      price: Number(input.shopping_mall_product_variant_pricing?.price ?? 0),
      base_price: 0,
      price_delta: 0,
      currency: input.shopping_mall_product_variant_pricing?.currency ?? "USD",
      inventory_quantity:
        input.shopping_mall_product_variant_inventory?.quantity ?? 0,
      reserved_quantity:
        (input.shopping_mall_cart_items?.length ?? 0) +
        (input.shopping_mall_wishlist_items?.length ?? 0),
      out_of_stock_threshold: 0,
      availability_status:
        input.shopping_mall_product_variant_inventory?.quantity > 0
          ? input.shopping_mall_product_variant_inventory?.quantity <= 0
            ? "low_stock"
            : "in_stock"
          : "out_of_stock",
      is_published:
        input.shopping_mall_product_variant_inventory?.is_published ?? false,
      product_id: input.product.id,
      product_name: input.product.name,
      product_brand:
        await ShoppingMallProductBrandAtSummaryTransformer.transform(
          input.product.brand,
        ),
      product_category:
        await ShoppingMallCategoryAtSummaryTransformer.transform(
          input.product.category,
        ),
      variant_attributes: await ArrayUtil.asyncMap(
        input.shopping_mall_product_variant_attributes,
        (attr) =>
          ShoppingMallVariantAttributeAtSummaryTransformer.transform(attr),
      ),
      available_options_count:
        input.shopping_mall_product_variant_attributes.length,
      reviews_count: input.shopping_mall_variant_audit_logs?.length ?? 0,
      average_rating:
        input.shopping_mall_variant_audit_logs?.length > 0
          ? input.shopping_mall_variant_audit_logs.reduce(
              (sum, r) => sum + r.rating,
              0,
            ) / input.shopping_mall_variant_audit_logs.length
          : 0,
      sales_count: input.shopping_mall_order_items?.length ?? 0,
      visibility_score:
        input.shopping_mall_product_variant_inventory?.visibility_score ?? 0,
      variant_tagged: input.shopping_mall_variant_templates.map((t) => t.tag),
      location_zones:
        input.shopping_mall_product_variant_inventory?.location_zones ?? [],
      compliance_status:
        input.shopping_mall_variant_audit_logs?.[0]?.compliance_status ??
        "compliant",
      production_status:
        input.shopping_mall_product_variant_inventory?.production_status ??
        "active",
      seo_title: input.shopping_mall_variant_templates?.[0]?.seo_title ?? "",
      seo_description:
        input.shopping_mall_variant_templates?.[0]?.seo_description ?? "",
      variant_type:
        input.shopping_mall_variant_templates?.[0]?.variant_type ?? "standard",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
