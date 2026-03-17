import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallWishlistItem } from "../../../../api/structures/IEcommerceMallWishlistItem";
import { IPageIEcommerceMallWishlistItem } from "../../../../api/structures/IPageIEcommerceMallWishlistItem";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { deleteEcommerceMallCustomerWishlistWishlistId } from "../../../../providers/deleteEcommerceMallCustomerWishlistWishlistId";
import { getEcommerceMallCustomerWishlistWishlistId } from "../../../../providers/getEcommerceMallCustomerWishlistWishlistId";
import { patchEcommerceMallCustomerWishlist } from "../../../../providers/patchEcommerceMallCustomerWishlist";
import { postEcommerceMallCustomerWishlist } from "../../../../providers/postEcommerceMallCustomerWishlist";

@Controller("/ecommerceMall/customer/wishlist")
export class EcommercemallCustomerWishlistController {
  /**
   * Add a product to the authenticated customer's wishlist.
   *
   * This operation enables customers to save products they are interested in purchasing later. The wishlist serves as a personal collection for product discovery and consideration. Each wishlist entry is created at the product level (not the variant level), meaning customers bookmark the entire product rather than a specific size, color, or other variant combination.
   *
   * **Security and Authorization:**
   * This endpoint requires customer authentication. Unauthenticated users (guests) cannot access wishlist functionality and will receive an authentication error. Each customer can only manage their own wishlist entries; cross-customer access is strictly prohibited.
   *
   * **Validation Rules:**
   * - The product must exist in the catalog and be available for viewing
   * - Duplicate prevention: If the product is already in the customer's wishlist, the existing entry is returned without creating a duplicate
   * - The request automatically associates the entry with the authenticated customer
   *
   * **Related Operations:**
   * After adding items to the wishlist, customers can:
   * - View their wishlist using the list/index operation
   * - Remove items using the delete/erase operation
   *
   * **Error Scenarios:**
   * - 401 Unauthorized: If the user is not authenticated
   * - 404 Not Found: If the referenced product does not exist or has been deleted
   * - 400 Bad Request: If the productId is missing or invalid
   *
   * **Automatic Cleanup:**
   * If a seller deletes a product, all wishlist entries referencing that product are automatically removed via cascade delete (handled at the database level, not through API operations).
   *
   * @param connection
   * @param body Product to add to the wishlist. Only the productId is required as variant selection occurs at cart/checkout time, not wishlist time.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation Details for Realize Agent:
   *
   * **Database Operations:**
   * 1. Extract customer_id from the authenticated session/JWT token
   * 2. Validate the product_id from the request body exists in ecommerce_mall_products table
   * 3. Check if a wishlist entry already exists for this customer_id + product_id combination using the @@unique constraint
   * 4. If exists, query and return the existing ecommerce_mall_wishlist_items record with joined product details
   * 5. If not exists:
   *    - Generate new UUID for the wishlist item id
   *    - Set created_at and updated_at to current timestamp (UTC)
   *    - Insert new record into ecommerce_mall_wishlist_items with customer_id, product_id, id, created_at, updated_at
   *
   * **Business Logic:**
   * - Authorization check: Verify the requester has a valid customer session
   * - Product validation: Ensure product exists and is not deleted (check products table)
   * - Duplicate handling: Query existing entry first; if found, return it directly (no error, silent success per business rule 513)
   * - Data integrity: The @@unique([customer_id, product_id]) constraint at database level guarantees no duplicates
   *
   * **Join Operations for Response:**
   * Join with ecommerce_mall_products to include product details in response:
   * - product.id, product.name, product.description, product.base_price
   * - product.category_id → join to get category name
   * - product.seller_id → join to get seller shop name from seller_profiles
   *
   * **Response Construction:**
   * Return the created/found wishlist item including:
   * - Wishlist item metadata (id, created_at, updated_at)
   * - Product summary (name, base_price, main image)
   * - Seller information (shop_name from joined seller_profiles)
   *
   * **Transaction Handling:**
   * Use a read-committed transaction for the check-then-create pattern to handle race conditions where the same customer might simultaneously request the same product twice.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallWishlistItem.ICreate,
  ): Promise<IEcommerceMallWishlistItem> {
    try {
      return await postEcommerceMallCustomerWishlist({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of wishlist items for the authenticated customer.
   *
   * This endpoint allows customers to browse their saved products in their wishlist. The operation returns wishlist items sorted by creation time with the most recently added items appearing first, as specified in the business requirements.
   *
   * The wishlist tracks products at the product level, not the variant level. Each wishlist item references a product saved by the customer for future consideration. The system enforces that each product can appear only once in a customer's wishlist through the composite unique constraint on [customer_id, product_id].
   *
   * Related operations include:
   * - POST /wishlist to add a new product to the wishlist
   * - DELETE /wishlist/{wishlistItemId} to remove a specific item from the wishlist
   * - PUT /wishlist/{wishlistItemId} to update item-specific preferences such as notes
   *
   * Authorization is required - only authenticated customers can access their own wishlist. The system enforces cross-customer wishlist access blocking, ensuring customers cannot view or modify wishlist entries belonging to other customers.
   *
   * @param connection
   * @param body Pagination and sorting parameters for wishlist item retrieval
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query the ecommerce_mall_wishlist_items table filtered by the authenticated customer's customer_id.
   *
   * Apply the following query logic:
   * 1. Filter by customer_id from the authenticated session
   * 2. Join with ecommerce_mall_products to retrieve product details
   * 3. Join with ecommerce_mall_customers to verify ownership
   * 4. Support pagination via limit and offset parameters from the request body
   * 5. Sort by created_at in descending order (newest first) as per business rules
   * 6. Return paginated results using cursor-based or offset pagination
   *
   * Validation rules:
   * - Require authenticated customer access; reject unauthenticated requests
   * - Enforce that returned items belong only to the requesting customer
   * - Handle empty wishlist by returning empty data array with pagination metadata
   *
   * The response should include wishlist item IDs, product references, creation timestamps, and associated product summaries (name, images, pricing).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallWishlistItem.IRequest,
  ): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
    try {
      return await patchEcommerceMallCustomerWishlist({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific wishlist item by its unique identifier.
   *
   * This operation returns detailed information about a single wishlist entry in the customer's wishlist collection. Wishlist items represent saved products that customers have marked for future consideration.
   *
   * **Security and Access Control:**
   * This endpoint requires customer authentication. Per strict access control policies, customers can only access their own wishlist items. The system validates ownership before returning any data. Cross-customer wishlist access is blocked to ensure wishlist privacy across the platform.
   *
   * **Product Availability Indication:**
   * The response includes product availability status based on the current state of the referenced product. If the seller has been suspended, the product has been deleted, or all variants are out of stock, the wishlist item will indicate unavailability. Customers cannot add unavailable wishlist items to cart, but the wishlist entry is preserved for reference.
   *
   * **Associated Data:**
   * The operation retrieves the complete product information including name, description, category, seller details, images, and variants with their current stock status and pricing. This allows customers to review product details when considering a purchase decision.
   *
   * **Related Operations:**
   * - `PATCH /wishlist` - List all wishlist items with pagination
   * - `POST /wishlist` - Add a new product to wishlist
   * - `DELETE /wishlist/{wishlistId}` - Remove a specific wishlist item
   *
   * @param connection
   * @param wishlistId Unique identifier of the wishlist item to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification 1. Authentication Check: Verify the requester has a valid customer session. If not authenticated, reject with 401 Unauthorized.
   *
   * 2. Extract wishlistId path parameter (UUID format).
   *
   * 3. Query the wishlist_items table by id:
   *    ```sql
   *    SELECT * FROM ecommerce_mall_wishlist_items WHERE id = {wishlistId}
   *    ```
   *
   * 4. Existence Check: If no record found, return 404 Not Found with error code "WISHLIST_ITEM_NOT_FOUND".
   *
   * 5. Ownership Validation: Compare the wishlist item's customer_id with the authenticated customer's id. If they do not match, return 403 Forbidden with error code "FORBIDDEN" (cross-customer access blocked per business rules).
   *
   * 6. Load associated Product data with related entities:
   *    - Product details (name, description, category, basePrice, status)
   *    - ProductImages (all images with display order)
   *    - ProductVariants (all variants with SKU code, options, price, current stock)
   *    - SellerProfile (shop name for display)
   *    - Category (name for display)
   *    - Reviews (aggregated count and average rating)
   *
   * 7. Determine Product Availability Status:
   *    - Check if seller is suspended: if yes → mark as unavailable
   *    - Check if product is deleted: if yes → mark as unavailable
   *    - Check if all variants are out of stock: if yes → mark as unavailable
   *    - Otherwise → mark as available
   *
   * 8. Return the wishlist item with full product details and availability flag.
   *
   * **Edge Cases:**
   * - If the product reference is broken (product was deleted but cleanup failed), still return the wishlist item with product marked as unavailable.
   * - If seller profile is missing or deleted, show seller as unavailable.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":wishlistId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("wishlistId")
    wishlistId: string,
  ): Promise<IEcommerceMallWishlistItem> {
    try {
      return await getEcommerceMallCustomerWishlistWishlistId({
        customer,
        wishlistId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a product from the customer's wishlist by deleting the wishlist item entry.
   *
   * This operation permanently removes a single wishlist item, dissociating the product from the customer's wishlist. The removal takes effect immediately and does not require confirmation.
   *
   * **Authorization**: Only the customer who owns the wishlist item can remove it. Other actors including administrators and sellers cannot modify a customer's wishlist contents directly.
   *
   * **Idempotency**: If the wishlist item does not exist or has already been removed, the request is processed silently with no error presented to the customer.
   *
   * **Scope**: The removal affects only the authenticated customer's wishlist. Other customers who have the same product in their wishlists retain their entries unaffected. This operation does not affect product availability, stock status, or the product itself.
   *
   * **Snapshot Behavior**: This is a simple deletion operation on the wishlist item. Product snapshots are not created for wishlist operations.
   *
   * @param connection
   * @param wishlistId Target wishlist item's unique identifier
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Validate the customer is authenticated. Lookup the wishlist item by its ID and verify ownership belongs to the authenticated customer. If the item does not exist, return silent success (204 No Content) per idempotency requirements. Delete the wishlist item record from the ecommerce_mall_wishlist_items table. Return no response body for successful deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":wishlistId")
  public async erase(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("wishlistId")
    wishlistId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteEcommerceMallCustomerWishlistWishlistId({
        customer,
        wishlistId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
