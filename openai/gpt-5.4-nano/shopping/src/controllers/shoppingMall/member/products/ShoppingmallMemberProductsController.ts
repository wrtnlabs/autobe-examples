import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProduct } from "../../../../api/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "../../../../api/structures/IShoppingMallProduct";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteShoppingMallMemberProductsProductId } from "../../../../providers/deleteShoppingMallMemberProductsProductId";
import { getShoppingMallMemberProductsProductId } from "../../../../providers/getShoppingMallMemberProductsProductId";
import { patchShoppingMallMemberProducts } from "../../../../providers/patchShoppingMallMemberProducts";
import { postShoppingMallMemberProducts } from "../../../../providers/postShoppingMallMemberProducts";
import { putShoppingMallMemberProductsProductId } from "../../../../providers/putShoppingMallMemberProductsProductId";

@Controller("/shoppingMall/member/products")
export class ShoppingmallMemberProductsController {
  /**
   * Create a new product listing for a seller-owned catalog entry.
   *
   * This operation creates a record in `shopping_mall_products`, which stores product-level attributes such as the seller ownership (`shopping_mall_seller_id`), category association (`shopping_mall_category_id`), seller-scoped `code`, customer-visible `name` and `description`, and listing visibility flags (`is_featured`) while preserving auditing metadata (`created_at`, `updated_at`).
   *
   * The platform treats products as monetized storefront content: visibility in customer browsing depends on product availability; the `deleted_at` column indicates the product is hidden from customer search and category listings while historical references can be preserved for dispute resolution.
   *
   * Security and authorization: only the authenticated seller that owns the target `shopping_mall_seller_id` is allowed to create products under their own ownership. If the seller account is suspended by administrators, the system rejects creation and does not create or modify product records.
   *
   * Validation and business rules: the seller must provide a category selection that is consistent with the configured category hierarchy constraints (one-level subcategory nesting). Invalid category selection must reject the operation and must not create or modify the product, nor any dependent snapshots.
   *
   * Related models: product images are stored in `shopping_mall_product_images` and are dependent assets of a product. Create flows that include image creation/editing must enforce the rule that the seller can only manage images for products belonging to themselves; rejected image operations must not create incorrect product snapshots.
   *
   * Expected errors and behavior: if the seller is not eligible to create (e.g., suspension), or if ownership/category validation fails, the operation returns an error and does not change persisted product state.
   *
   * See also: after creation, products can be listed and searched via product listing/search endpoints (not covered here), and detailed views can be retrieved by product identifier.
   *
   *
   * @param connection
   * @param body Payload for creating a seller-owned product, including product-level attributes required to create shopping_mall_products and any optional dependent creation details supported by IShoppingMallProduct.ICreate.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1) Parse body as IShoppingMallProduct.ICreate.
   * 2) Resolve seller identity from auth context; set shopping_mall_seller_id to the authenticated seller member id (do not accept/override by client).
   * 3) Validate category selection against shopping_mall_categories hierarchy rules (including optional one-level parent constraint). Reject if invalid pairing; do not write any rows.
   * 4) Validate product code uniqueness within the seller: enforce @@unique([shopping_mall_seller_id, code]). If already exists, reject.
   * 5) Insert into shopping_mall_products with provided name/description/is_featured, and set deleted_at to null.
   * 6) If the request includes images, insert shopping_mall_product_images rows tied to the created product id, validating seller ownership and ensuring image ordering via display_order. On any validation/authorization failure during image handling, roll back the transaction so no product rows or image rows are left in an inconsistent state, and do not create product snapshots.
   * 7) Return the created product by selecting the row and mapping it to IShoppingMallProduct response DTO.
   * Transactionality:
   * - Use a single database transaction for product creation plus any dependent image inserts. Roll back on any error.
   * Edge cases:
   * - Seller suspension: reject early before inserting.
   * - Invalid category nesting: reject before inserting.
   * - Duplicate seller-scoped code: reject with conflict.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createProduct(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallProduct.ICreate,
  ): Promise<IShoppingMallProduct> {
    try {
      return await postShoppingMallMemberProducts({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated, filterable list of products for customer browsing and seller management views.
   *
   * This endpoint corresponds to the `shopping_mall_products` table, which stores product-level attributes such as `code`, `name`, `description`, `is_featured`, and a `deleted_at` timestamp that hides products from active storefront listings and search results.
   *
   * Because this operation uses `PATCH`, it accepts a request body that contains search criteria and pagination/sorting options (for example: filtering by seller scope, category scope, or matching by product name/description). The backend must translate these criteria into database queries that target `shopping_mall_products`, applying listing visibility rules that are consistent with the existence of `deleted_at`.
   *
   * Security and authorization: access must be restricted according to actor permissions. For customer-facing browsing, results should be limited to products that are considered visible/listable. For seller-focused views, the query must be scoped to products belonging to that seller via `shopping_mall_seller_id`. Administrators should be allowed to query across sellers as governed by admin rules.
   *
   * Validation and correctness rules: this is a read-only operation, so it must not create or modify any records and must not create snapshots. Snapshot integrity principles (e.g., creating snapshots only on successful edits, and never creating misleading snapshots on validation failures) are inherently satisfied because no edit is attempted.
   *
   * Related operations: clients typically combine this list with product detail retrieval (by product identifier) to display complete product information and then may call additional endpoints for variant availability and reviews. When product images are shown, the storefront should rely on the product’s associated images from `shopping_mall_product_images`, which are managed in the context of product editing and are not modified by this endpoint.
   *
   * Expected behavior and error handling: return `200` with an empty paginated list when no products match. If the request contains invalid filter/sort combinations, return a clear validation error without any data changes.
   *
   * @param connection
   * @param body Search criteria, pagination, and sorting options for filtering products.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query `shopping_mall_products` with pagination and filtering derived from `IShoppingMallProduct.IRequest`.
   *
   * Implementation steps:
   * 1) Authorization scope
   *    - Determine caller actor (guest/member/admin).
   *    - If seller-scoped view: constrain by `shopping_mall_seller_id` to the caller seller member id.
   *    - If customer browsing: constrain to products considered visible (apply `deleted_at IS NULL`).
   *    - Admin: allow broader querying, but still apply any platform-wide listing visibility rules required by admin browsing expectations.
   * 2) Build search filters
   *    - Apply exact match filters when request criteria specify `code`, `shopping_mall_category_id`, or seller/category scopes.
   *    - Apply text search for `name` and `description` using ILIKE/trigram strategies consistent with schema indexes (`gin_trgm_ops`).
   *    - Ensure any nullability constraints are honored (e.g., category id filter is optional).
   * 3) Sorting and pagination
   *    - Apply requested sort field(s) and direction; default to `created_at` descending if none provided.
   *    - Implement cursor- or offset-style pagination according to the `IPage...` contract in DTOs.
   * 4) Select only summary fields
   *    - Fetch fields needed by `IShoppingMallProduct.ISummary`.
   * 5) Response
   *    - Return `IPageIShoppingMallProduct.ISummary` including pagination metadata and `data`.
   *
   * Edge cases:
   * - If seller/category ids are provided but no matching records exist, return an empty page.
   * - Never perform any write operations or snapshot creation.
   * - Ensure soft-deleted products (`deleted_at` set) are excluded for customer-visible browsing paths.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallProduct.IRequest,
  ): Promise<IPageIShoppingMallProduct.ISummary> {
    try {
      return await patchShoppingMallMemberProducts({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a single shopping mall product by its unique identifier.
   *
   * This endpoint serves customer and seller storefront needs by returning the product-level attributes stored in `shopping_mall_products`, including the seller and category ownership references, display name/description, featured flag, and the record’s lifecycle timestamps. Because products can be hidden from listings when `shopping_mall_products.deleted_at` is set, clients should treat visibility as a separate concern from data retrieval: this operation returns the product data for the requested ID, and the service implementation should apply the same visibility/access rules used across the platform.
   *
   * Security and authorization are enforced by the service layer based on the caller’s actor. The operation is a read request, so it does not create or modify any database rows. Authorized access determines whether the returned product is usable for customer browsing or restricted to the owning seller/admin.
   *
   * Relationship-wise, the returned product is anchored to `shopping_mall_products` which belongs to exactly one seller (`shopping_mall_members`) and exactly one category (`shopping_mall_categories`). The implementation should load only what is required for the product detail response shape, relying on the existing relationships for any additional nested data included by the DTO.
   *
   * Validation and error handling: the service must validate that `productId` is a valid UUID. If no product exists for the given ID, return a not-found error. If the product exists but is not accessible under the current authorization context (for example, product hidden due to `deleted_at` semantics or seller suspension behaviors), the service should return the appropriate authorization/visibility error rather than leaking inaccessible product data.
   *
   * Related operations you may combine with this endpoint:
   *
   * - Product listing/search endpoints (typically paginated) to discover candidate product IDs.
   * - Product variant and product image retrieval endpoints to present richer product pages after obtaining the product ID here.
   *
   * This endpoint is read-only and does not depend on pre-executing other APIs; however, it may internally join or fetch related entities depending on the response DTO definition.
   *
   * @param connection
   * @param productId Target product identifier (UUID).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1. Validate `productId` is present and parse as UUID.
   * 2. Start a database query against `shopping_mall_products` filtering by `id = productId`.
   * 3. If the product is not found, throw/return a NotFound error.
   * 4. Authorization/visibility:
   *    - Determine caller actor (guest/member/admin) from the request context.
   *    - If caller is a customer/guest and the product is not meant to be visible (e.g., `deleted_at` is set), deny access with an authorization/visibility error.
   *    - If caller is the owning seller (match `shopping_mall_seller_id` to the seller identity), allow read even when hidden/disabled per seller management rules, consistent with platform behavior.
   *    - Admin should be allowed under admin oversight rules.
   * 5. Map the `shopping_mall_products` row fields to the response DTO `IShoppingMallProduct`.
   * 6. Return JSON response with status 200.
   *
   * DB access pattern:
   * - Use a single-row fetch by primary key.
   * - Optionally include required relationship identifiers (seller/category IDs) as required by `IShoppingMallProduct` schema; do not assume additional fields not present in that DTO.
   *
   * Edge cases:
   * - Invalid UUID format for `productId` should return a validation error.
   * - Authorization failure should not reveal whether the product exists if your platform uses that pattern; otherwise return a standard forbidden/unauthorized error according to existing error conventions.
   *
   * No transaction is needed because this endpoint is read-only.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":productId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProduct> {
    try {
      return await getShoppingMallMemberProductsProductId({
        member,
        productId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a seller-managed product’s main attributes by its identifier.
   *
   * This operation targets the platform’s seller-owned product record stored in `shopping_mall_products`, which contains the seller reference (`shopping_mall_seller_id`), the category reference (`shopping_mall_category_id`), seller-scoped code (`code`), product name/description, and listing/visibility controls (`is_featured`). Because products are monetized data, product edits are handled in a way that supports dispute resolution through immutable product snapshots.
   *
   * Security and authorization are strict: sellers can edit only products that belong to them. If the authenticated seller attempts to edit a product that is owned by a different seller, the system rejects the request. Additionally, while a seller account is suspended by administrators, the system denies the ability to edit existing products and hides the seller’s products from customer listings/search; this operation must reject edit attempts during suspension.
   *
   * The request updates only product-level fields (not variant definitions and not product images). Image ordering/edit/delete and variant/inventory adjustments are managed by their own dedicated flows, and those flows must preserve snapshot integrity on failures.
   *
   * Validation behavior includes rejecting attempts to update fields that violate domain rules, including category selection correctness for the referenced category and seller ownership constraints for the target product. On successful update, the system returns the updated product representation.
   *
   * Related operations: product editing eligibility and product-level state visibility are consistent with seller suspension rules, product ownership rules, and product snapshot recording used throughout product mutation workflows.
   *
   * @param connection
   * @param productId Target product identifier to update.
   * @param body Product update payload containing seller-owned product-level fields to modify.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1) Parse `productId` from path and validate it is a UUID.
   * 2) Authenticate the caller as a member with seller capabilities (enforce member/seller auth middleware as provided by the system).
   * 3) Load the target row from `shopping_mall_products` by `id`.
   *    - If not found, return 404.
   * 4) Authorization checks:
   *    - Ensure the authenticated seller’s member id matches `shopping_mall_products.shopping_mall_seller_id`.
   *    - If mismatch, reject with authorization/ownership error.
   *    - Ensure the seller is not suspended per administrative status.
   *      If suspended, reject with the seller-suspended edit error.
   * 5) Apply update validation for product-level fields from `IShoppingMallProduct.IUpdate`.
   *    - Validate the referenced category id exists in `shopping_mall_categories`.
   *    - Validate any seller-scoped code constraints if the update allows `code` changes (must remain unique within the same seller: `@@unique([shopping_mall_seller_id, code])`).
   *    - Validate business rules for name/description and featured flag.
   * 6) Transactional write:
   *    - Begin transaction.
   *    - Update `shopping_mall_products` row fields.
   *    - Create an immutable product snapshot row in `shopping_mall_product_snapshots` capturing point-in-time product attributes after applying the update. Ensure snapshot denormalized fields match the product state used for dispute resolution.
   *    - Commit transaction.
   * 7) Return the updated product record as `IShoppingMallProduct`.
   * 8) Error handling:
   *    - Any validation/authorization failure must not update the product row and must not create incorrect snapshots.
   *    - Database constraint violations (e.g., duplicate seller-scoped code) should be mapped to a client-friendly validation error.
   *
   * Notes:
   * - This operation must not directly modify variant rows (`shopping_mall_product_variants`) or image rows (`shopping_mall_product_images`). Those concerns are handled by their own flows with their own snapshot-integrity rules.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":productId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProduct.IUpdate,
  ): Promise<IShoppingMallProduct> {
    try {
      return await putShoppingMallMemberProductsProductId({
        member,
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a product from the requesting party’s management scope by marking it unavailable for customer browsing.
   *
   * This operation applies the platform’s deletion behavior for products: once the seller (or an administrator) deletes a product, the product must stop appearing in customer search and category listings, while historical product and variant snapshot records remain available for owners and administrators to view the product state at the time of relevant events (for example, past orders and dispute resolution).
   *
   * The deletion process must also follow product deletion eligibility rules: when there are any pending paid or shipped order items for any variant of the target product, the system must reject the deletion request and must not allow the seller to remove the product in a way that would remove purchase-related items that are still pending shipment or already shipped.
   *
   * Security and authorization: a seller can only delete products that belong to them. If the target product is owned by another seller, the operation must be rejected and must not change any existing browsing visibility or snapshot records. Administrators are allowed to delete products within their governance scope.
   *
   * Related behavior and consistency: deleting the product also removes it from wishlists automatically, so wishlist entries referencing the deleted product no longer appear for browsing purposes. The operation does not attempt to delete customer order history; past order records and their snapshots remain available for audit and dispute resolution.
   *
   * This operation should be used together with customer browsing read operations (for example, product detail and list endpoints) which will reflect the deletion result by no longer returning the deleted product in listings/search after the deletion completes.
   *
   * @param connection
   * @param productId Target product identifier (UUID) to remove from customer browsing.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps (service-layer):
   *
   * 1) Extract productId from path.
   * 2) Authorize caller:
   *    - If caller is a seller, load the product by id and verify product.shopping_mall_seller_id matches the caller’s member id.
   *    - If caller is an admin, allow.
   *    - Otherwise, reject.
   * 3) Load the target product record (shopping_mall_products) and ensure it exists.
   * 4) Deletion eligibility check (enforce rule):
   *    - Determine whether any shopping_mall_order_items exist for order items whose shopping_mall_product_variant_id belongs to any variant of this product.
   *    - A variant belongs to the product if shopping_mall_product_variants.shopping_mall_product_id == target product id.
   *    - Consider order-item workflow states by reading shopping_mall_order_items.line_item_status and applying the business mapping for "pending paid or shipped" (implementation must use the canonical status values used by the system).
   *    - If at least one matching order item exists, reject with an eligibility error; do NOT modify the product or snapshots.
   * 5) Perform the deletion effect:
   *    - Apply shopping_mall_products.deleted_at = now (soft deletion for browsing visibility).
   *    - Do not hard-delete snapshots and does not delete order records.
   * 6) Wishlist consistency:
   *    - Ensure wishlist browsing no longer shows the deleted product by relying on wishlist item presentation rules together with product deleted_at.
   *    - If system requires explicit removal, update shopping_mall_wishlist_items by marking deleted_at when shopping_mall_wishlist_items.shopping_mall_product_id == target product id.
   * 7) Return success (no payload).
   *
   * Database queries:
   * - Find product by id from shopping_mall_products.
   * - Fetch variant ids for the product from shopping_mall_product_variants (shopping_mall_product_id = product id).
   * - Check order items existence from shopping_mall_order_items where shopping_mall_product_variant_id IN variant ids AND line_item_status in the pending/shipped eligible set.
   * - Update shopping_mall_products.deleted_at.
   * - Optionally update shopping_mall_wishlist_items.deleted_at similarly.
   *
   * Transactions/edge cases:
   * - Use a transaction so that eligibility checks and deletion updates are atomic.
   * - If multiple concurrent delete attempts occur, re-check eligibility inside the same transaction.
   * - If the product is already deleted (deleted_at set), treat it as idempotent success or reject according to system conventions; ensure no eligibility bypass occurs.
   *
   * Error handling:
   * - Not found: return a standard not-found error.
   * - Forbidden: ownership mismatch for sellers.
   * - Eligibility blocked: return a domain error indicating pending paid/shipped order items prevent deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":productId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallMemberProductsProductId({
        member,
        productId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
