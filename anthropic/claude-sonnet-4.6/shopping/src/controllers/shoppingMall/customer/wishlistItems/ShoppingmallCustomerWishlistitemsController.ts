import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallWishlistItem } from "../../../../api/structures/IPageIShoppingMallWishlistItem";
import { IShoppingMallWishlistItem } from "../../../../api/structures/IShoppingMallWishlistItem";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { deleteShoppingMallCustomerWishlistItemsWishlistItemId } from "../../../../providers/deleteShoppingMallCustomerWishlistItemsWishlistItemId";
import { getShoppingMallCustomerWishlistItemsWishlistItemId } from "../../../../providers/getShoppingMallCustomerWishlistItemsWishlistItemId";
import { patchShoppingMallCustomerWishlistItems } from "../../../../providers/patchShoppingMallCustomerWishlistItems";
import { postShoppingMallCustomerWishlistItems } from "../../../../providers/postShoppingMallCustomerWishlistItems";

@Controller("/shoppingMall/customer/wishlistItems")
export class ShoppingmallCustomerWishlistitemsController {
  /**
   * Add a product to the authenticated customer's personal wishlist.
   *
   * This operation allows an authenticated customer to save a product to their wishlist for future purchase consideration. The wishlist is a purely personal reference list — it does not reserve stock, affect inventory, or trigger any purchase flow. Customers use the wishlist to track products they are interested in and return to them later, eventually adding a specific variant to the cart when ready to purchase.
   *
   * The wishlist tracks products as a whole (i.e., the `shopping_mall_products` entity), not specific variants. A customer does not need to select a product variant or quantity when adding to the wishlist. Only the target product identifier is required in the request body.
   *
   * A customer's wishlist enforces uniqueness at the product level: the composite unique constraint on (`shopping_mall_customer_id`, `shopping_mall_product_id`) in the `shopping_mall_wishlist_items` table ensures that the same product cannot appear more than once in a single customer's wishlist. If a customer attempts to add a product that is already present in their wishlist, the system handles the request gracefully and returns the existing wishlist item without creating a duplicate entry. The customer is informed that the product was already saved.
   *
   * Access to this endpoint is restricted to authenticated customers only. Unauthenticated visitors (guests) are denied access regardless of the product being requested. The customer's identity is determined from the authenticated session and is not specified as a path or request body parameter. A customer can only add items to their own wishlist; cross-customer wishlist modification is not permitted.
   *
   * After adding a product to the wishlist, the customer can view their full wishlist via `PATCH /wishlistItems` and remove individual items via `DELETE /wishlistItems/{wishlistItemId}`. To proceed from wishlist to purchase, the customer selects a specific variant and adds it to the cart through the standard cart flow.
   *
   * @param connection
   * @param body The product to add to the customer's wishlist
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Authenticate the requesting customer from the
     *   session token. Reject with 401 if unauthenticated. Reject with 403 if
     *   banned.
   *
   * 2. Extract the target product ID from the request body (`shopping_mall_product_id`).
   *
   * 3. Verify the referenced product exists in `shopping_mall_products` and is not deleted (`deleted_at IS NULL`). Return 404 if the product is not found or has been deleted.
   *
   * 4. Check if a wishlist item already exists for the (customer_id, product_id) pair by querying `shopping_mall_wishlist_items` for a record matching both `shopping_mall_customer_id` = authenticated customer ID and `shopping_mall_product_id` = requested product ID.
   *
   * 5. If the record already exists, return it as-is with HTTP 200 (or 201 with an indicator that it was pre-existing). The composite unique constraint `@@unique([shopping_mall_customer_id, shopping_mall_product_id])` prevents duplicate rows at the database level.
   *
   * 6. If the record does not exist, INSERT a new row into `shopping_mall_wishlist_items` with:
   *    - `id`: new UUID
   *    - `shopping_mall_customer_id`: authenticated customer's ID
   *    - `shopping_mall_product_id`: provided product ID
   *    - `created_at`: current timestamp
   *
   * 7. Return the newly created (or existing) `shopping_mall_wishlist_items` record, joined with relevant product summary fields for the response DTO.
   *
   * 8. Ensure the operation is transactionally safe to avoid race conditions when concurrent requests attempt to add the same product.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallWishlistItem.ICreate,
  ): Promise<IShoppingMallWishlistItem> {
    try {
      return await postShoppingMallCustomerWishlistItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated and filterable list of wishlist items belonging to the currently authenticated customer.
   *
   * This operation returns all products the authenticated customer has saved to their personal wishlist, presented in a paginated format with optional search and sorting capabilities. Each wishlist item in the response includes the associated product's key information such as name, base price, category, and images, allowing clients to render the wishlist page without additional product lookup calls.
   *
   * The wishlist is a personal list of products a customer saves for future purchase consideration. As defined in the shopping_mall_wishlist_items table, each entry records the association between a customer (shopping_mall_customer_id) and a product (shopping_mall_product_id), along with the timestamp when the product was added (created_at). A customer may only have one entry per product due to the composite unique constraint on (shopping_mall_customer_id, shopping_mall_product_id).
   *
   * Access is strictly restricted to authenticated customers. Only the currently authenticated customer's own wishlist items are returned — the customer identity is derived from the session token and cannot be overridden by request parameters. Unauthenticated access and attempts to view another customer's wishlist are rejected.
   *
   * The request body allows clients to specify keyword-based filtering (matched against product names), pagination parameters (page number and page size), and sorting preferences (e.g., by date added, product name). Products that have been removed from the platform (soft-deleted via deleted_at in shopping_mall_products) are excluded from results.
   *
   * Related operations:
   * - `POST /shoppingMall/customer/wishlistItems`: Add a new product to the current customer's wishlist.
   * - `DELETE /shoppingMall/customer/wishlistItems/{wishlistItemId}`: Remove a specific product from the current customer's wishlist.
   *
   * @param connection
   * @param body Search criteria, pagination parameters, and sorting options for the customer's wishlist items
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Authenticate the request: extract the customer
     *   identity from the session token. Reject unauthenticated requests. 2.
     *   Query the shopping_mall_wishlist_items table filtered by
     *   shopping_mall_customer_id matching the authenticated customer's ID. 3.
     *   Join with shopping_mall_products on shopping_mall_product_id to fetch
     *   product details (name, base_price, category, etc.). Exclude products
     *   where deleted_at IS NOT NULL. 4. Apply any keyword search filter from
     *   the request body against the product name field using a trigram index
     *   (GIN index on name in shopping_mall_products). 5. Apply pagination
     *   using the provided page and pageSize from the request body. Default to
     *   page 1 and a reasonable page size (e.g., 20) if not specified. 6. Apply
     *   sorting as requested: default sort is by
     *   shopping_mall_wishlist_items.created_at DESC. Also support sorting by
     *   product name ASC. 7. Return results wrapped in a standard IPage
     *   envelope with pagination metadata (total count, current page, page
     *   size, total pages). 8. Each result item (ISummary) should include
     *   wishlist item ID, created_at, and embedded product summary info
     *   (product ID, name, base_price, category info, primary image URL). 9.
     *   Edge cases: if the wishlist is empty, return an empty data array with
     *   pagination metadata showing 0 total items. If a product has been
     *   deleted between the time it was wishlisted and this request, exclude it
     *   from results (filter via products.deleted_at IS NULL).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallWishlistItem.IRequest,
  ): Promise<IPageIShoppingMallWishlistItem.ISummary> {
    try {
      return await patchShoppingMallCustomerWishlistItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single wishlist item by its unique identifier.
   *
   * This operation returns the detailed information for a specific entry in the authenticated customer's personal wishlist. Each wishlist item represents a product that the customer has saved for future consideration. The record corresponds to a row in the `shopping_mall_wishlist_items` table, which stores the customer-to-product association along with the timestamp recording when the customer added the product.
   *
   * The wishlist tracks interest at the product level rather than at the variant level. The returned item includes the saved product's summary information — including its main image, name, base price or price range, seller shop name, and average rating — allowing the customer to review their saved product without having selected a specific variant at the time of saving.
   *
   * Access is strictly restricted to the authenticated customer who owns the wishlist item. If the provided `wishlistItemId` belongs to a wishlist item owned by a different customer, the system rejects the request and returns an authorization error. Unauthenticated users (guests) are denied access entirely; only logged-in customers may use this endpoint.
   *
   * This endpoint is typically used when a customer navigates to a specific wishlist entry to view its current product details. For browsing the full wishlist in paginated form, use `PATCH /wishlistItems` instead. To add a product to the wishlist, use `POST /wishlistItems`. To remove the wishlist item, use `DELETE /wishlistItems/{wishlistItemId}`.
   *
   * @param connection
   * @param wishlistItemId The UUID of the target wishlist item to retrieve. Must belong to the authenticated customer.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Authenticate the request: verify that the
     *   caller is a logged-in customer. Reject with 401 if unauthenticated. 2.
     *   Look up the shopping_mall_wishlist_items record by the provided
     *   wishlistItemId (UUID primary key). Return 404 if not found. 3. Verify
     *   that the record's shopping_mall_customer_id matches the authenticated
     *   customer's ID. If it does not match, return 403 to prevent
     *   cross-customer wishlist access. 4. Join with shopping_mall_products to
     *   fetch the saved product's current information: name, main image (first
     *   ordered image from shopping_mall_product_images), base price or price
     *   range derived from shopping_mall_product_variants, seller shop name
     *   (from shopping_mall_sellers), and average rating (aggregated from
     *   shopping_mall_reviews). 5. Return the wishlist item record along with
     *   the embedded product summary. 6. Edge case: if the product has been
     *   deleted (via onDelete: Cascade), the wishlist item itself would have
     *   been removed; this scenario results in a 404 response. 7. No business
     *   state transitions occur; this is a read-only operation with no side
     *   effects.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":wishlistItemId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("wishlistItemId")
    wishlistItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallWishlistItem> {
    try {
      return await getShoppingMallCustomerWishlistItemsWishlistItemId({
        customer,
        wishlistItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a specific item from the authenticated customer's wishlist.
   *
   * This operation permanently removes the wishlist entry identified by `wishlistItemId` from the `shopping_mall_wishlist_items` table. The `shopping_mall_wishlist_items` table stores customer-to-product associations, where each record links a `shopping_mall_customers` customer to a `shopping_mall_products` product that the customer has saved for future consideration. Each wishlist item targets the product itself rather than a specific variant, allowing the customer to express general interest.
   *
   * Only the authenticated customer who owns the wishlist item is permitted to remove it. Attempts to remove a wishlist item belonging to another customer will be rejected. This endpoint is exclusively accessible to customers who are logged in with an active session.
   *
   * The removal operation is designed to be idempotent and forgiving. If the specified `wishlistItemId` does not exist in the customer's wishlist — whether because it was already removed in a previous request, removed through another session, or was automatically cleaned up when the associated product was deleted by the seller — the operation completes successfully without raising an error. This graceful behavior ensures a consistent user experience across multiple sessions and race conditions.
   *
   * Once removed, the product no longer appears in the customer's wishlist. The removal is permanent; there is no undo or restore capability. If the customer wishes to re-add the product to their wishlist, they must use the wishlist item creation endpoint. Related operations include browsing the wishlist (`PATCH /wishlistItems`) and adding products to the wishlist (`POST /wishlistItems`).
   *
   * @param connection
   * @param wishlistItemId The UUID of the wishlist item record to remove. Corresponds to shopping_mall_wishlist_items.id.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Authenticate the request and extract the
     *   currently logged-in customer identity from the session token. Reject
     *   non-customer actors. 2. Look up the shopping_mall_wishlist_items record
     *   by the provided wishlistItemId (UUID primary key). 3. If no record is
     *   found with that id, return a successful response immediately without
     *   error (graceful no-op behavior as per business rule section 347). 4. If
     *   a record is found, verify that the shopping_mall_customer_id on the
     *   record matches the authenticated customer's id. If the record belongs
     *   to a different customer, return a 403 Forbidden error. 5. Delete the
     *   matching shopping_mall_wishlist_items record from the database using a
     *   DELETE query scoped to both the wishlistItemId and the authenticated
     *   customer's id (e.g., WHERE id = :wishlistItemId AND
     *   shopping_mall_customer_id = :customerId). This single scoped query
     *   naturally handles the graceful no-op case without a separate existence
     *   check. 6. Return an empty 200 or 204 response to indicate successful
     *   completion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":wishlistItemId")
  public async erase(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("wishlistItemId")
    wishlistItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallCustomerWishlistItemsWishlistItemId({
        customer,
        wishlistItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
