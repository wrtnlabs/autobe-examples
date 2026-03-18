import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallWishlistItem } from "../../../../../api/structures/IShoppingMallWishlistItem";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId } from "../../../../../providers/deleteShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId";
import { getShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId } from "../../../../../providers/getShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId";
import { patchShoppingMallMemberWishlistsWishlistIdItems } from "../../../../../providers/patchShoppingMallMemberWishlistsWishlistIdItems";
import { postShoppingMallMemberWishlistsWishlistIdItems } from "../../../../../providers/postShoppingMallMemberWishlistsWishlistIdItems";
import { putShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId } from "../../../../../providers/putShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId";

@Controller("/shoppingMall/member/wishlists/:wishlistId/items")
export class ShoppingmallMemberWishlistsItemsController {
  /**
   * Add a product to the authenticated member’s wishlist.
   *
   * This endpoint targets a specific customer wishlist identified by `wishlistId` and creates a single wishlist-item record linking that wishlist to the requested product. The wishlist stores products at the product level (not product variants), so adding a variant-targeted product must still map to product-level wishlist membership.
   *
   * The operation enforces consistency rules required for wishlist functionality:
   *
   * - The wishlist must belong to the authenticated member.
   * - The system must prevent duplicates so that adding the same product again does not create another entry within the same wishlist.
   * - The system must reject additions when the referenced product is no longer eligible to be wished (for example, the seller has removed the product from the catalog or the product is otherwise unavailable). If a product becomes unavailable after it was previously wishlisted, subsequent views should not display that unavailable product.
   *
   * If validation fails (wishlist not owned by the caller, product missing or ineligible, or duplicate add attempt), the operation must fail without changing the customer’s existing wishlist contents.
   *
   * Related operations typically include viewing the wishlist contents (paginated) and removing wishlist items.
   *
   * @param connection
   * @param wishlistId Target wishlist identifier. The wishlist must be owned by the authenticated member.
   * @param body Payload to add a product to the target wishlist. The server will create a new wishlist-item record for the (wishlist, product) pair while preventing duplicates and enforcing product eligibility rules.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1) Authorization: authenticate the caller as a member. Load `shopping_mall_wishlists` by `id = wishlistId` and verify `shopping_mall_member_id` matches the authenticated member’s id. If not found or not owned, return an authorization/ownership error.
   *
   * 2) Request validation: read `shopping_mall_product_id` (productId) from request body. Validate it is a UUID string.
   *
   * 3) Product eligibility check: load `shopping_mall_products` by `id = shopping_mall_product_id` and verify it exists and is eligible for wishlist display. If `shopping_mall_products.deleted_at` is set (product hidden/deleted), reject the operation.
   *
   * 4) Duplicate handling: attempt to create `shopping_mall_wishlist_items` with:
   *    - `shopping_mall_wishlist_id = wishlistId`
   *    - `shopping_mall_product_id = shopping_mall_product_id`
   *    - timestamps: set `created_at`/`updated_at` to now
   *    - `deleted_at` must be null for active items
   *    Use an upsert-like guard or handle unique constraint violation on `@@unique([shopping_mall_wishlist_id, shopping_mall_product_id])` by returning a duplicate/already-added error and without creating any additional row.
   *
   * 5) Consistency with product deletion: if the system detects that the target product is missing or has `deleted_at` set during validation, reject with a clear error indicating the item cannot be added.
   *
   * 6) Transactionality: wrap steps 3-4 in a transaction to prevent partial state when concurrent updates happen (e.g., product deleted while adding).
   *
   * 7) Response: return the created `shopping_mall_wishlist_items` row transformed to the corresponding DTO.
   *
   * Database operations:
   * - SELECT wishlist by id and owner
   * - SELECT product by id and check deleted_at
   * - INSERT wishlist_item (enforce unique pair)
   *
   * Error handling:
   * - Wishlist not found / not owned: reject
   * - Product not found or deleted/ineligible: reject
   * - Duplicate (unique constraint): reject as already added
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createWishlistItem(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("wishlistId")
    wishlistId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallWishlistItem.ICreate,
  ): Promise<IShoppingMallWishlistItem> {
    try {
      return await postShoppingMallMemberWishlistsWishlistIdItems({
        member,
        wishlistId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Manage wishlist item membership within a specific wishlist.
   *
   * This operation targets the junction records stored in `shopping_mall_wishlist_items`, which associate exactly one wishlist (`shopping_mall_wishlist_id`) with exactly one product (`shopping_mall_product_id`). The owning wishlist is `shopping_mall_wishlists`, which links the wishlist to a member account via `shopping_mall_member_id` and is treated as a private container for that member.
   *
   * Access control: wishlist operations are available only to authenticated customers. Unauthenticated (guest) access must be blocked so the system does not create, modify, or reveal wishlist contents. Authorization must additionally enforce ownership by verifying that the authenticated member is the owner of the target wishlist (`shopping_mall_wishlists.shopping_mall_member_id`).
   *
   * Data integrity and visibility: `shopping_mall_wishlist_items` enforces a uniqueness constraint on `(shopping_mall_wishlist_id, shopping_mall_product_id)`, preventing duplicate wishlist entries for the same product within the same wishlist. The table also includes `deleted_at` for hiding removed items without removing the row; the operation must ensure that responses and subsequent behaviors treat items consistently with `deleted_at` (for example, not showing an entry that is marked removed).
   *
   * Business consistency under concurrent product lifecycle changes: wishlist views must remain consistent with product eligibility outcomes. In particular, if a product becomes deleted by its seller, the platform must automatically remove the corresponding wishlist items so the deleted product no longer appears in wishlist listings. When the operation is called concurrently with such lifecycle changes, it must apply the same ownership validation and duplicate handling rules to avoid leaving the wishlist in an inconsistent state.
   *
   * Expected behaviors: the operation accepts an instruction payload to perform the requested wishlist-item action(s) under the given `wishlistId`, validates that the target wishlist belongs to the caller, validates product references as needed, and then returns the resulting wishlist items (or the relevant updated item representation) in a way that respects `deleted_at` visibility.
   *
   * Related operations: combine this endpoint with wishlist retrieval endpoints (e.g., viewing wishlist items) to build a full customer wishlist UI flow. If the UI needs to display the current wishlist state, it should call the dedicated wishlist/playlist item listing endpoint after performing this operation to reflect the latest `deleted_at`-filtered records.
   *
   * @param connection
   * @param wishlistId Target wishlist identifier that scopes wishlist-item operations. Must belong to the authenticated member.
   * @param body Instruction payload describing which product(s) should be added/removed (or otherwise modified) within the specified wishlist. The implementation must be idempotent with respect to the (wishlist, product) uniqueness constraint and must respect deleted_at visibility rules.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authorization and ownership
   * - Authenticate caller as a member/customer.
   * - Load shopping_mall_wishlists by id = wishlistId.
   * - Verify the authenticated member id matches shopping_mall_wishlists.shopping_mall_member_id. If not, return authorization/ownership error.
   * - If shopping_mall_wishlists.deleted_at is not null, treat wishlist as hidden/unavailable and reject.
   *
   * 2) Input interpretation
   * - Parse the request body into an operation instruction for wishlist items under this wishlistId (as defined by IShoppingMallWishlistItem.IRequest).
   * - Validate that the instruction includes product identifiers needed to find/create/remove wishlist item rows.
   *
   * 3) Duplicate prevention and deleted_at handling
   * - For each target product in the instruction:
   *   a) Query shopping_mall_wishlist_items where shopping_mall_wishlist_id = wishlistId and shopping_mall_product_id = productId.
   *   b) If an existing row exists and deleted_at is null:
   *      - For add-like intentions: treat as no-op (do not create duplicates).
   *   c) If an existing row exists but deleted_at is not null:
   *      - For re-add-like intentions: set deleted_at back to null (if the instruction semantics require restoration) OR treat as already removed based on request instruction.
   *   d) If no row exists:
   *      - For add-like intentions: create a new shopping_mall_wishlist_items row with shopping_mall_wishlist_id and shopping_mall_product_id.
   *
   * 4) Consistency with product lifecycle deletions
   * - If the instruction targets a product that is currently ineligible because it has been deleted, reject or treat as no-op according to instruction semantics.
   * - Ensure the system does not return wishlist items that should be absent due to auto-removal expectations.
   *
   * 5) Transactionality
   * - Execute all modifications for the instruction in a single database transaction per request.
   * - After mutation, fetch and return the updated wishlist item summaries for items affected, filtered to deleted_at is null.
   *
   * 6) Errors
   * - If wishlistId does not exist or is hidden, return 404/410-style error as per existing error mapping.
   * - On constraint violations (e.g., unique constraint races), re-check for existing record and apply idempotent behavior.
   *
   * Note: This specification relies on downstream DTO definitions for the exact request instruction fields and response shape.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async patch(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("wishlistId")
    wishlistId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallWishlistItem.IRequest,
  ): Promise<IShoppingMallWishlistItem> {
    try {
      return await patchShoppingMallMemberWishlistsWishlistIdItems({
        member,
        wishlistId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the details of a single wishlist item inside a specific wishlist.
   *
   * This endpoint is used when a customer wants to view or open a particular wished product entry from their wishlist, identified by both the wishlist container and the wishlist item record.
   *
   * The operation queries `shopping_mall_wishlist_items`, which represents one saved product within exactly one wishlist via `shopping_mall_wishlist_id` and `shopping_mall_product_id`. It also references `shopping_mall_wishlists` to scope the result to the requesting member (`shopping_mall_member_id`) and to ensure the wishlist is not hidden.
   *
   * For browsing correctness, wishlist items are subject to visibility rules based on `deleted_at` fields. If the wishlist itself (`shopping_mall_wishlists.deleted_at`) is hidden, or if the wishlist item record (`shopping_mall_wishlist_items.deleted_at`) is hidden, this endpoint must not reveal the item and should return an appropriate not-found response.
   *
   * Relationship-wise, the wishlist item points to exactly one product (`shopping_mall_products`). The service should join the product data required by `IShoppingMallWishlistItem` so the client can render the wished product details from the wishlist context.
   *
   * Authorization: only the owning authenticated member may access their own wishlist and its items. Guests must be blocked from wishlist access.
   *
   * Related operations:
   *
   * - Use the wishlist listing endpoint (paginated) to browse multiple wishlist items.
   * - Use product browsing/listing endpoints to discover products outside of a customer's wishlist.
   *
   * Errors/edge handling:
   *
   * - If the `wishlistId` and `wishlistItemId` do not match, treat it as not found.
   * - If the product behind the wishlist item is deleted by the seller, the system removes the product from wishlists, so this endpoint must behave consistently with the removal and not return a hidden/unavailable item record.
   *
   * @param connection
   * @param wishlistId The target wishlist container ID owned by the requesting member.
   * @param wishlistItemId The wishlist item record ID within the given wishlist.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authenticate requester as a member; block guests.
   *
   * 2) Input handling:
   * - Validate `wishlistId` and `wishlistItemId` are UUID strings.
   *
   * 3) Authorization & scoping:
   * - Determine requesting member id from the session context.
   * - Load `shopping_mall_wishlists` row by `id = wishlistId` with constraint `shopping_mall_member_id = requesterMemberId`.
   * - If not found, or if `shopping_mall_wishlists.deleted_at` is not null, return 404.
   *
   * 4) Fetch wishlist item:
   * - Query `shopping_mall_wishlist_items` where
   *   - `id = wishlistItemId`
   *   - `shopping_mall_wishlist_id = wishlistId`
   * - Apply visibility filter: require `shopping_mall_wishlist_items.deleted_at` is null.
   * - If not found, return 404.
   *
   * 5) Join product for display:
   * - Join `shopping_mall_products` by `id = shopping_mall_wishlist_items.shopping_mall_product_id`.
   * - Apply product visibility: do not return product data if `shopping_mall_products.deleted_at` is not null.
   *
   * 6) Response mapping:
   * - Map the wishlist item + required product fields into `IShoppingMallWishlistItem`.
   *
   * 7) Performance:
   * - Use a single query with joins when possible.
   * - Ensure database access is index-friendly (wishlist id and wishlist item id filters).
   *
   * 8) Edge cases:
   * - If product was removed from wishlists due to seller deletion, the wishlist item should already be removed/hidden by system processes; if nevertheless present but hidden/unavailable, return 404.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":wishlistItemId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("wishlistId")
    wishlistId: string & tags.Format<"uuid">,
    @TypedParam("wishlistItemId")
    wishlistItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallWishlistItem> {
    try {
      return await getShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId({
        member,
        wishlistId,
        wishlistItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates a specific wishlist item inside a customer wishlist.
   *
   * This operation targets a single record in `shopping_mall_wishlist_items`, which represents that a customer saved exactly one product (wishlist item references a single `shopping_mall_products.id`) inside exactly one wishlist (it references `shopping_mall_wishlists.id`). The wishlist item row includes `created_at` and `updated_at` timestamps for auditing, and a nullable `deleted_at` timestamp used to hide an item while keeping the row for consistency.
   *
   * Use this endpoint when a customer needs to change the state of an existing wishlist item. The request is applied only to the wishlist item identified by `wishlistItemId` and scoped to the parent wishlist identified by `wishlistId` to prevent cross-wishlist modifications.
   *
   * Security/authorization: only the authenticated member who owns the referenced wishlist may update its items. The operation must verify that the `shopping_mall_wishlists` row (by `shopping_mall_wishlists.id`) belongs to the current authenticated member before writing. If authorization fails, the endpoint must reject the request.
   *
   * Validation and business behavior: the update must not violate the integrity that a wishlist item represents exactly one product inside exactly one wishlist. Since the database enforces a unique constraint on `(shopping_mall_wishlist_id, shopping_mall_product_id)`, the service layer must treat updates that would cause duplicates as invalid and reject them.
   *
   * Deletion visibility behavior: when the update intends to remove the item from the customer’s visible wishlist, the service should set `deleted_at` (instead of physically removing the row). When the update intends to re-enable visibility, the service should clear `deleted_at`.
   *
   * Related operations: listing and retrieving a wishlist are handled by separate wishlist read endpoints (e.g., viewing wishlist items in pages). If a seller deletes a product, wishlist items for that product must be automatically removed from wishlist views; this operation should treat a target item for a now-missing product as not updatable (reject or no-op depending on the status provided by the request).
   *
   * @param connection
   * @param wishlistId Target wishlist identifier whose ownership is checked against the authenticated member.
   * @param wishlistItemId Target wishlist item identifier within the specified wishlist.
   * @param body Update payload for the specified wishlist item. Use it to change the product association or the item visibility state represented by `deleted_at` (or related fields exposed in the DTO).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authenticate the caller as a member; deny if not authenticated.
   *
   * 2) Load the wishlist by `shopping_mall_wishlists.id = wishlistId`.
   *    - Verify that `shopping_mall_wishlists.shopping_mall_member_id` matches the current authenticated member.
   *
   * 3) Load the wishlist item by `shopping_mall_wishlist_items.id = wishlistItemId`.
   *    - Verify its parent: `shopping_mall_wishlist_items.shopping_mall_wishlist_id` equals the loaded wishlist id.
   *
   * 4) Validate request body (IShoppingMallWishlistItem.IUpdate) against allowed updateable columns only.
   *    - Do not allow clients to set `created_at`.
   *    - If the request attempts to change visibility, implement by setting/clearing `deleted_at` (nullable DateTime).
   *
   * 5) If the request changes `shopping_mall_product_id`:
   *    - Because the database has `@@unique([shopping_mall_wishlist_id, shopping_mall_product_id])`, check for an existing row with the same (wishlist_id, product_id) that is not the current row.
   *    - If such a row exists, reject with a validation error.
   *
   * 6) Apply update in a transaction:
   *    - Update `shopping_mall_wishlist_items.deleted_at` and/or `shopping_mall_product_id` as instructed.
   *    - Set `updated_at = now()`.
   *
   * 7) Return the updated wishlist item DTO (IShoppingMallWishlistItem).
   *
   * Edge cases:
   * - If wishlist or wishlist item does not exist, reject with a not-found error.
   * - If item belongs to a different wishlistId, reject.
   * - If authorization fails, reject.
   * - If request attempts to update an item whose referenced product has been deleted (so it should not be visible), reject or treat as not found.
   *
   * No physical deletion is performed by this endpoint; visibility is controlled by `deleted_at`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":wishlistItemId")
  public async updateWishlistItem(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("wishlistId")
    wishlistId: string & tags.Format<"uuid">,
    @TypedParam("wishlistItemId")
    wishlistItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallWishlistItem.IUpdate,
  ): Promise<IShoppingMallWishlistItem> {
    try {
      return await putShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId({
        member,
        wishlistId,
        wishlistItemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Removes a single item from a customer’s wishlist.
   *
   * This operation targets exactly one wishlist entry identified by `wishlistItemId`, within the parent container identified by `wishlistId`. The backend uses the underlying `shopping_mall_wishlist_items` row as the source of truth for whether the product is currently present in the wishlist’s item listing. Deleting the item updates the wishlist item’s `deleted_at` timestamp so that the item is hidden from subsequent wishlist views and pagination results.
   *
   * Authorization and data ownership are enforced through the association between the wishlist (`shopping_mall_wishlists`) and its owner (`shopping_mall_member_id`). Only an authenticated member who owns the target wishlist can remove its items. Requests that reference a wishlist not owned by the caller must not reveal item existence; the implementation should treat such cases as not found or forbidden per the project’s error conventions.
   *
   * Validation and consistency rules: the system must not partially update wishlist contents. The implementation should locate the wishlist item row by both the parent wishlist id and the wishlist item id scope. If the item does not exist for the given `wishlistId`, or if it is already hidden (its `deleted_at` is already set), the operation should behave idempotently (no-op) and keep the wishlist item listing consistent.
   *
   * After successful removal, the deleted product must no longer appear in subsequent wishlist views. This aligns with the end-to-end expectation that wishlist contents reflect removals immediately in later reads.
   *
   * Related operations: callers typically pair this with the wishlist listing/search operation(s) so that the UI refreshes after the removal. If the product was previously removed due to seller deletion, the system already supports auto-removal behavior; this endpoint still behaves consistently with the item hiding mechanism to prevent further wishlist interaction with removed products.
   *
   * @param connection
   * @param wishlistId Target wishlist id whose items are being managed.
   * @param wishlistItemId Target wishlist item id to remove from the wishlist.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authorization: Resolve the authenticated member identity and load `shopping_mall_wishlists` by `id = wishlistId`. Verify `shopping_mall_member_id` matches the caller. If not, reject with forbidden/not-found per error policy.
   *
   * 2) Target lookup (scoped): In a single transaction, query `shopping_mall_wishlist_items` with:
   *    - `id = wishlistItemId`
   *    - `shopping_mall_wishlist_id = wishlistId`
   *    - Optionally require `deleted_at IS NULL` for performing the state transition; if already deleted, treat as idempotent no-op.
   *
   * 3) State transition (no partial updates):
   *    - If row exists and `deleted_at` is NULL, set `deleted_at = now()` and update `updated_at` to now().
   *    - If row does not exist or `deleted_at` is already set, do nothing (idempotent no-op).
   *
   * 4) Transaction/consistency:
   *    - Commit the update (or no-op) as one atomic operation.
   *    - Ensure subsequent reads filter out rows where `deleted_at IS NOT NULL`.
   *
   * 5) Edge cases:
   *    - Invalid UUID formats should be rejected by request validation.
   *    - Concurrency: if two requests race, the second request should observe `deleted_at` already set and no-op.
   *
   * 6) Integration notes:
   *    - Do not return item payload; the UI can refresh by calling the wishlist items listing operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":wishlistItemId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("wishlistId")
    wishlistId: string & tags.Format<"uuid">,
    @TypedParam("wishlistItemId")
    wishlistItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId(
        {
          member,
          wishlistId,
          wishlistItemId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
