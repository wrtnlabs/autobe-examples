import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductVariant } from "../../../../api/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "../../../../api/structures/IShoppingMallProductVariant";
import { getShoppingMallProductsProductIdVariantsVariantId } from "../../../../providers/getShoppingMallProductsProductIdVariantsVariantId";
import { patchShoppingMallProductsProductIdVariants } from "../../../../providers/patchShoppingMallProductsProductIdVariants";

@Controller("/shoppingMall/products/:productId/variants")
export class ShoppingmallProductsVariantsController {
  /**
   * Retrieve a paginated and filterable list of product variants belonging to a specific product.
   *
   * This operation returns all purchasable configurations (variants) of a product identified by `productId`. Each variant in the `shopping_mall_product_variants` table represents a unique combination of option values (e.g., color: Red, size: Large), stored as child records in `shopping_mall_product_variant_options`. Variants may also carry an optional `price_override` that supersedes the parent product's `base_price`.
   *
   * The response is paginated and supports filtering by SKU code (partial match), option key-value pairs, availability (in-stock vs. out-of-stock), and active vs. removed state. By default, only active (non-removed) variants — those with a null `deleted_at` — are included in the results. Sellers viewing their own product may additionally request that removed variants be included, for audit or restoration purposes.
   *
   * Stock level for each variant is not stored directly on the `shopping_mall_product_variants` record; it is derived by aggregating all `shopping_mall_inventory_records` for that variant. A variant whose derived stock is zero is considered out of stock and will be indicated as unavailable for purchase. Customers attempting to add an out-of-stock variant to their cart will be blocked.
   *
   * The endpoint is accessible to customers (for browsing a product's available configurations), sellers (for reviewing and managing their own product's variants), and administrators (for platform oversight). Customers will only see active variants; sellers and admins may additionally filter on removed variants.
   *
   * Before calling this endpoint, `PATCH /products` or `GET /products/{productId}` should be used to locate the target product. The `productId` path parameter corresponds to the `id` primary key of `shopping_mall_products`. If the product does not exist or has been removed, a 404 error is returned.
   *
   * Sorting is supported by creation date, SKU code, and price, enabling sellers to quickly audit their variant catalog and customers to find the configuration they need.
   *
   * @param connection
   * @param productId The UUID of the target product whose variants are to be listed.
   * @param body Search, filter, and pagination criteria for listing product variants.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification 1. Validate that the product identified by `productId` exists in `shopping_mall_products` and its `deleted_at` is null (or allow admins/sellers to see removed products if needed). Return 404 if not found.
   *
   * 2. Query `shopping_mall_product_variants` where `shopping_mall_product_id = productId`. By default, filter `deleted_at IS NULL` to exclude removed variants. If the authenticated actor is a seller (owning this product) or admin and the request body includes `includeDeleted: true`, remove the `deleted_at IS NULL` filter.
   *
   * 3. Apply optional filters from the request body:
   *    - `skuKeyword`: partial/ILIKE match on the `sku` column.
   *    - `optionFilters`: array of { key, value } pairs that must match `shopping_mall_product_variant_options` entries (join and filter).
   *    - `inStockOnly`: if true, only return variants whose derived stock (SUM of `shopping_mall_inventory_records.quantity` for the variant) > 0.
   *    - `priceMin` / `priceMax`: filter on effective price (use `price_override` when not null, otherwise `base_price` from the parent product).
   *
   * 4. For each variant, eagerly load `shopping_mall_product_variant_options` ordered by `sequence` to include option key-value pairs in the response summary.
   *
   * 5. Compute derived stock level by joining or aggregating `shopping_mall_inventory_records` per variant (SUM of quantity). Include `inStock: boolean` and `stockQuantity: number` in the summary.
   *
   * 6. Apply sorting (default: `created_at DESC`). Supported sort fields: `created_at`, `sku`, `price_override` (effective price).
   *
   * 7. Apply cursor-based or offset pagination using `page` and `limit` from the request body. Return the paginated result wrapped in the standard `IPage` envelope with `pagination` metadata (current page, total pages, total count, limit).
   *
   * 8. Return 403 if a seller attempts to include deleted variants for a product they do not own. Admins bypass this check.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductVariant.IRequest,
  ): Promise<IPageIShoppingMallProductVariant.ISummary> {
    try {
      return await patchShoppingMallProductsProductIdVariants({
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific product variant.
   *
   * This operation returns the complete details of a single product variant identified by its unique ID, scoped under the owning product. A product variant (stored in the `shopping_mall_product_variants` table) represents one specific, purchasable configuration of a product — for example, a clothing item's 'Red / Large' combination. Each variant carries a platform-wide unique SKU code, an optional price override that supersedes the parent product's base price, and one or more option key-value pairs (stored in `shopping_mall_product_variant_options`) that define its distinguishing attributes such as color, size, or material.
   *
   * The response includes the variant's SKU code, price override (if set), all associated option dimensions in their configured display order (via the `sequence` field on each option), creation timestamp, and last-updated timestamp. Active variants (where `deleted_at` is null) are always retrievable. Variants that have been removed by the seller (`deleted_at` is set) are excluded from customer-facing browsing and will result in a 404 response.
   *
   * The `productId` path parameter scopes the lookup to variants belonging to that product, reflecting the database relationship where each `shopping_mall_product_variants` record references its owning `shopping_mall_products` via `shopping_mall_product_id`. If the specified variant does not belong to the specified product, a 404 response is returned to enforce this ownership boundary.
   *
   * This endpoint is accessible to all actors including unauthenticated users, customers, sellers, and administrators. Customers use it to view variant details on a product page before making a purchase decision. Sellers use it to inspect their own variant configurations. Administrators may access it for oversight purposes.
   *
   * Related operations: Use `PATCH /products` or `GET /products/{productId}` to discover available products. Use `PATCH /products/{productId}/variants` to list all variants of a product. Use `PUT /products/{productId}/variants/{variantId}` to update variant attributes. Use `DELETE /products/{productId}/variants/{variantId}` to remove a variant.
   *
   * @param connection
   * @param productId The UUID of the product that owns the target variant.
   * @param variantId The UUID of the product variant to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification 1. Validate that `productId` corresponds to an existing, non-deleted product in `shopping_mall_products` (deleted_at IS NULL). If not found, return 404.
   * 2. Validate that `variantId` corresponds to an existing record in `shopping_mall_product_variants` where `shopping_mall_product_id = productId` AND `deleted_at IS NULL`. If the variant does not exist, is deleted, or belongs to a different product, return 404.
   * 3. Query `shopping_mall_product_variants` for the matching record. Include a JOIN or sub-query to fetch all associated `shopping_mall_product_variant_options` records ordered by their `sequence` field ascending.
   * 4. Map the result to `IShoppingMallProductVariant`, including: id, sku, price_override (nullable), created_at, updated_at, and the ordered list of options (each with id, key, value, sequence, created_at).
   * 5. Return the mapped DTO as the response body with HTTP 200.
   * 6. No authentication is strictly required for public product browsing, but the implementation may expose seller-specific data (e.g., internal SKU) only to authenticated sellers or admins.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":variantId")
  public async at(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductVariant> {
    try {
      return await getShoppingMallProductsProductIdVariantsVariantId({
        productId,
        variantId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
