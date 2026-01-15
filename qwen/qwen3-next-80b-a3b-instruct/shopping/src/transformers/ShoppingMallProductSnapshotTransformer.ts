import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotChangeDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotChangeDetails";
import { IShoppingMallProductSnapshotAttributeValues } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotAttributeValues";
import { IShoppingMallProductSnapshotVariantPrices } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantPrices";
import { IShoppingMallProductSnapshotVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantInventory";
import { IShoppingMallProductSnapshotVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAttributes";
import { IShoppingMallProductSnapshotVariantImages } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantImages";
import { IShoppingMallProductSnapshotVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAvailability";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        primary_category_id: true,
        brand_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      product_id: input.product.id,
      version_number: 0,
      snapshot_source: "automatic",
      name: input.title,
      description: input.description,
      status: input.status satisfies string as
        | "active"
        | "inactive"
        | "archived",
      category_id: (input.primary_category_id ??
        typia.random<
          string & tags.Format<"uuid">
        >()) satisfies string as string & tags.Format<"uuid">,
      subcategory_ids: [],
      brand_id: input.brand_id,
      manufacturer: "",
      sku: "",
      is_published: false,
      price: 0,
      currency: "USD",
      has_variants: false,
      is_featured: false,
      is_new: false,
      is_best_seller: false,
      tag_ids: [],
      variant_count: 0,
      inventory_count: 0,
      is_in_stock: false,
      availability_status: "out_of_stock",
      is_active: false,
      weight_grams: 0,
      length_cm: 0,
      width_cm: 0,
      height_cm: 0,
      images_url: [],
      meta_title: "",
      meta_description: "",
      canonical_url: "",
      seo_keywords: [],
      created_by: null,
      modified_by: null,
      change_summary: "",
      change_details: undefined,
      change_type: "initial",
      deleted_by: null,
      is_deleted_by_admin: false,
      deleted_reason: null,
      is_archived: false,
      is_compliance_snapshot: false,
      snapshot_expiry_utc: null,
      source_system: null,
      data_source: "product",
      external_ref_id: null,
      review_count: 0,
      average_rating: 0,
      order_count: 0,
      total_revenue: 0,
      search_score: 0,
      search_keywords: [],
      visibility_score: 0,
      is_in_promotion: false,
      promotion_name: null,
      promotion_discount_percentage: null,
      promotion_end_date: null,
      is_featured_in_category: false,
      is_featured_on_homepage: false,
      is_best_seller_in_category: false,
      is_new_arrival: false,
      is_trending: false,
      product_attribute_values: undefined,
      variant_prices: undefined,
      variant_inventory: undefined,
      variant_attributes: undefined,
      variant_images: undefined,
      variant_availability: undefined,
    };
  }
}
