import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallSeller } from "../../../../api/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "../../../../api/structures/IShoppingMallSeller";
import { SuperadminAuth } from "../../../../decorators/SuperadminAuth";
import { SuperadminPayload } from "../../../../decorators/payload/SuperadminPayload";
import { patchShoppingMallSuperAdminSellers } from "../../../../providers/patchShoppingMallSuperAdminSellers";
import { postShoppingMallSuperAdminSellersSellerIdBan } from "../../../../providers/postShoppingMallSuperAdminSellersSellerIdBan";
import { postShoppingMallSuperAdminSellersSellerIdSuspend } from "../../../../providers/postShoppingMallSuperAdminSellersSellerIdSuspend";
import { postShoppingMallSuperAdminSellersSellerIdUnban } from "../../../../providers/postShoppingMallSuperAdminSellersSellerIdUnban";
import { postShoppingMallSuperAdminSellersSellerIdUnsuspend } from "../../../../providers/postShoppingMallSuperAdminSellersSellerIdUnsuspend";
import { putShoppingMallSuperAdminSellersSellerId } from "../../../../providers/putShoppingMallSuperAdminSellersSellerId";

@Controller("/shoppingMall/superAdmin/sellers")
export class ShoppingmallSuperadminSellersController {
  /**
   * Retrieve a filtered and paginated list of seller accounts registered on the shopping mall platform.
   *
   * This operation provides super administrators with advanced search and filtering capabilities over the `shopping_mall_sellers` table, enabling platform-wide seller oversight. Super administrators can filter sellers by shop name (partial text match), email address, account status flags such as `is_banned` and `is_suspended`, and registration date ranges. Sorting and pagination are also fully supported to accommodate large numbers of registered sellers.
   *
   * Each seller record in the `shopping_mall_sellers` table stores the seller's unique email address used for authentication, a hashed password (never exposed in API responses), the current shop name as displayed to customers, boolean flags for `is_banned` and `is_suspended` which control platform access and product visibility, and timestamps for account creation (`created_at`), last update (`updated_at`), and logical deletion (`deleted_at`). Active sellers are those without a `deleted_at` value set.
   *
   * The response returns a paginated collection of seller summaries, where each summary includes the seller's identifier, shop name, email, account status flags, and timestamps. This provides super administrators with the information needed to audit seller accounts, identify suspended or banned sellers, and perform bulk management actions.
   *
   * This endpoint is restricted exclusively to super administrator actors, who hold platform-wide oversight authority as defined by the platform's permission model. Regular sellers cannot access other sellers' account data, and regular administrators do not have access to this specific super-administrator-scoped endpoint.
   *
   * Related operations include retrieving a specific seller by ID for full detail, approving or rejecting seller registrations via the SellerApproval workflow, and suspending or banning individual seller accounts. The seller profile snapshot history (in `shopping_mall_seller_profile_snapshots`) can also be reviewed through dedicated endpoints to trace shop profile changes over time.
   *
   * @param connection
   * @param body Search criteria, filters, sorting, and pagination parameters for querying the seller list
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification Implementation steps for the service layer:
   *
   * 1. Parse and validate the incoming IShoppingMallSeller.IRequest body, which contains optional filter criteria (shop_name substring, email substring, is_banned filter, is_suspended filter, created_at date range) and pagination parameters (page, limit) and sorting (field, direction).
   *
   * 2. Build a Prisma query against the `shopping_mall_sellers` table:
   *    - Always exclude records where `deleted_at IS NOT NULL` (i.e., logically deleted sellers).
   *    - Apply `shop_name` filter using trigram/LIKE search if provided.
   *    - Apply `email` filter using LIKE or exact match if provided.
   *    - Apply `is_banned` filter if specified.
   *    - Apply `is_suspended` filter if specified.
   *    - Apply `created_at` range filter (from/to) if provided.
   *
   * 3. Count the total number of matching records for pagination metadata.
   *
   * 4. Fetch the paginated subset using OFFSET/LIMIT based on page and limit parameters.
   *
   * 5. Map each `shopping_mall_sellers` record to `IShoppingMallSeller.ISummary`, which should include: id, email, shop_name, is_banned, is_suspended, created_at, updated_at.
   *
   * 6. Return an IPageIShoppingMallSeller.ISummary object containing the pagination metadata (current page, total pages, total records, limit) and the data array of seller summaries.
   *
   * Edge cases:
   * - If no sellers match the filters, return an empty data array with correct pagination metadata.
   * - If pagination parameters are out of range (page beyond total pages), return an empty data array.
   * - Validate that numeric pagination fields (page, limit) are positive integers.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedBody()
    body: IShoppingMallSeller.IRequest,
  ): Promise<IPageIShoppingMallSeller.ISummary> {
    try {
      return await patchShoppingMallSuperAdminSellers({
        superAdmin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the profile information of an existing seller account.
   *
   * This operation allows a seller to update their own shop profile, including the shop name, shop description, and logo image URL. Each successful profile update is persisted to the `shopping_mall_sellers` table and simultaneously triggers the creation of a new immutable snapshot record in `shopping_mall_seller_profile_snapshots`, preserving the historical audit trail of all profile changes over time.
   *
   * The `shopping_mall_sellers` table stores the seller's current active shop name alongside authentication credentials and account state flags (`is_banned`, `is_suspended`). The `shopping_mall_seller_profile_snapshots` table captures point-in-time snapshots of the seller's public-facing shop profile (shop name, shop description, logo URL) as they appeared at each moment of change. These snapshots are immutable and are also embedded into order item records at purchase time to preserve the seller's identity as experienced by the customer.
   *
   * Only the authenticated seller who owns the account identified by `sellerId` may perform this update. Administrators may also perform profile updates on behalf of sellers through appropriate admin-level access. Account state changes such as banning or suspending a seller are not handled by this operation — those are administrator-only actions performed through separate endpoints.
   *
   * The `sellerId` path parameter must match the UUID primary key of an existing seller record in `shopping_mall_sellers`. If the record does not exist, the operation returns a 404 error. If the authenticated actor does not have permission to modify the specified seller's profile, a 403 error is returned.
   *
   * After a successful update, the response returns the full updated seller entity reflecting the new profile state. Clients that have previously retrieved seller profile snapshots may wish to re-fetch the seller's detail to obtain the latest profile information.
   *
   * @param connection
   * @param sellerId The UUID of the target seller account to update (global scope).
   * @param body Updated profile information for the seller, including shop name, description, and logo URL.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Extract and validate the `sellerId` UUID path
     *   parameter. Confirm that a record exists in `shopping_mall_sellers`
     *   where `id = sellerId` and `deleted_at IS NULL`. Return 404 if not
     *   found. 2. Authenticate the requesting actor. Verify that the
     *   authenticated seller's id matches `sellerId`, or that the requester
     *   holds an admin-level role. Return 403 if unauthorized. 3. Validate the
     *   request body fields: - `shop_name`: required, non-empty string. -
     *   `shop_description`: optional, nullable string. - `logo_url`: optional,
     *   nullable URI string (max length 80000 chars as per schema). 4. Within a
     *   single database transaction: a. UPDATE `shopping_mall_sellers` SET
     *   `shop_name = :shopName`, `updated_at = NOW()` WHERE `id = :sellerId`.
     *   b. INSERT a new record into `shopping_mall_seller_profile_snapshots`
     *   with `seller_id = sellerId`, `shop_name`, `shop_description`,
     *   `logo_url`, and `created_at = NOW()`. 5. Return the updated seller
     *   entity with all current fields (excluding `password_hash`).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":sellerId")
  public async update(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallSeller.IUpdate,
  ): Promise<IShoppingMallSeller> {
    try {
      return await putShoppingMallSuperAdminSellersSellerId({
        superAdmin,
        sellerId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Ban a seller account on the shopping mall platform, immediately preventing the seller from logging in.
   *
   * This operation is restricted to administrators (both regular and super administrators). When a seller account is banned, the seller's `is_banned` flag in the `shopping_mall_sellers` table is set to `true`, and any existing active sessions for that seller are immediately invalidated. After banning, all subsequent login attempts by that seller will be rejected by the authentication system.
   *
   * All historical data associated with the banned seller is fully preserved. This includes all existing orders, order items, shipments, cancellation requests, refund requests, seller profile snapshots, and product records. The ban does not disrupt any in-progress order fulfillment workflows from the perspective of the system records — however, since the seller can no longer log in, administrators may need to intervene on outstanding obligations.
   *
   * The system enforces idempotency protection: if the target seller account is already in a banned state, the operation is rejected with an appropriate error. Attempting to ban a non-existent seller also results in an error. Banning does not permanently delete any data — the seller account and all associated records remain in the database.
   *
   * To reverse a ban, use the corresponding unban operation. To view the current ban and suspension status of a seller, use the seller detail retrieval endpoint.
   *
   * @param connection
   * @param sellerId The UUID of the target seller account to ban.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Authenticate the caller and verify they hold a
     *   valid admin or superAdmin session token. 2. Look up the seller record
     *   in shopping_mall_sellers by the provided sellerId (UUID). Return 404 if
     *   not found. 3. Check the seller's current `is_banned` field. If
     *   `is_banned` is already `true`, reject the request with a 409 Conflict
     *   error indicating the seller is already banned. 4. Within a database
     *   transaction: a. Set `is_banned = true` on the shopping_mall_sellers
     *   record. b. Update `updated_at` to the current timestamp. c. Invalidate
     *   all active JWT sessions for this seller by deleting or revoking records
     *   in shopping_mall_seller_sessions. 5. Commit the transaction. 6. Return
     *   the updated seller record (IShopping_MallSellerSummary or
     *   IShoppingMallSeller) reflecting the new banned state. 7. Edge cases: -
     *   If the seller account has `deleted_at` set (account deleted), return
     *   404 or 410. - Concurrent ban requests for the same seller should be
     *   handled via optimistic locking or a unique constraint check to avoid
     *   double-processing. - Do NOT delete or modify any orders, order items,
     *   shipments, cancellation requests, refund requests, product snapshots,
     *   or seller profile snapshots associated with this seller.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":sellerId/ban")
  public async ban(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSeller> {
    try {
      return await postShoppingMallSuperAdminSellersSellerIdBan({
        superAdmin,
        sellerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Lift a ban from a seller account, restoring the seller's ability to log in and resume normal platform operations.
   *
   * This operation allows any administrator (regular or super) to remove a ban that was previously applied to a seller account. Once the ban is lifted, the seller regains full login access and can resume managing their products, processing orders, responding to cancellation and refund requests, and performing all other normal seller activities.
   *
   * The target seller account is identified by its unique UUID (`sellerId`). The operation updates the `is_banned` flag on the `shopping_mall_sellers` record from `true` to `false` and records the change timestamp in `updated_at`.
   *
   * This operation enforces strict idempotency protection: if the specified seller account is not currently banned (i.e., `is_banned` is already `false`), the system rejects the request and returns an error. This prevents accidental double-unban actions from causing unexpected side effects.
   *
   * Bans on sellers are a platform-level account restriction distinct from account suspension (`is_suspended`). Unbanning restores login capability but does not automatically restore a seller from a separately applied suspension — the suspended state is managed independently through the suspend/unsuspend operations.
   *
   * Only authenticated administrators (regular or super administrator grade) are authorized to perform this operation. Customers, sellers, and unauthenticated guests are denied access. Both regular and super administrators have equal authority to unban seller accounts, as defined by the platform's administrator grade rules.
   *
   * Related operations:
   * - `POST /sellers/{sellerId}/ban` — Apply a ban to a seller account (prerequisite action before this operation is applicable).
   * - `GET /sellers/{sellerId}` — Retrieve current seller account details to inspect ban and suspension states prior to acting.
   * - `POST /sellers/{sellerId}/suspend` / `POST /sellers/{sellerId}/unsuspend` — Independently manage seller suspension state.
   *
   * @param connection
   * @param sellerId The unique UUID of the seller account to unban.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Authenticate the requesting actor and verify
     *   they hold an admin or superAdmin role. Reject with 403 if not. 2. Look
     *   up the seller in shopping_mall_sellers by the provided sellerId (UUID).
     *   Return 404 if not found or if deleted_at is non-null. 3. Check the
     *   seller's current is_banned field. If is_banned is false, reject the
     *   request with a 422/conflict error indicating the seller is not
     *   currently banned. 4. Update the seller record: set is_banned = false,
     *   set updated_at = current timestamp. Use a database transaction to
     *   ensure atomicity. 5. Return the updated seller record as
     *   IShoppingMallSeller, reflecting the new is_banned = false state. 6.
     *   Edge cases: - Seller not found (deleted or non-existent): 404 - Seller
     *   already unbanned (is_banned = false): 422 with descriptive error
     *   message - Insufficient authorization: 403 - The seller's is_suspended
     *   field is NOT modified by this operation; suspension state remains
     *   independent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":sellerId/unban")
  public async unban(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSeller> {
    try {
      return await postShoppingMallSuperAdminSellersSellerIdUnban({
        superAdmin,
        sellerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Suspend an active seller account on the shopping mall platform.
   *
   * This operation allows a regular administrator or super administrator to place a seller account into a suspended state. Upon successful suspension, the `is_suspended` flag on the `shopping_mall_sellers` record is set to `true`, and several immediate platform-wide effects take effect as described below.
   *
   * **Immediate Effects of Suspension**
   *
   * When a seller account is suspended, all products belonging to that seller are immediately hidden from search results and category listings. Customers can no longer browse, add to cart, or purchase any of the suspended seller's products. The suspended seller account itself retains limited access: the seller may still log in to process their existing orders — including shipping order items that are in `paid` status and responding to (approving or rejecting) any open cancellation requests or refund requests tied to their order items — but cannot create new products or edit any existing products.
   *
   * **Validation and Rejection Conditions**
   *
   * This operation enforces several pre-conditions before applying the suspension. If the target seller account identified by `sellerId` is already in a suspended state (`is_suspended = true`), the request is rejected to prevent duplicate state transitions. Similarly, if the target seller account is currently banned (`is_banned = true`), the suspension action is also rejected, since a banned seller has already lost all platform access and the suspended state would be redundant and inconsistent. The operation validates that the seller record exists and is in an active (non-deleted, non-banned, non-suspended) state before proceeding.
   *
   * **Authorization**
   *
   * Only authenticated administrators (regular admin or super administrator) are permitted to invoke this endpoint. The requesting admin's identity is verified through their active session. Seller accounts, customer accounts, and unauthenticated guests have no access to this operation.
   *
   * **Related Operations**
   *
   * To reverse a suspension, use `POST /sellers/{sellerId}/unsuspend`. To view the current state and details of a seller, use `GET /sellers/{sellerId}`. To view a paginated list of sellers filtered by suspension status, use `PATCH /sellers`.
   *
   * @param connection
   * @param sellerId The UUID of the seller account to suspend (global scope).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Authenticate the calling admin via their
     *   session token. Reject with 401 if no valid admin session is present. 2.
     *   Look up the seller record in `shopping_mall_sellers` by `sellerId`
     *   (UUID). Return 404 if not found or if `deleted_at` is non-null. 3.
     *   Check `is_banned`: if `true`, reject with a 422/409 error — banned
     *   sellers cannot be suspended. 4. Check `is_suspended`: if already
     *   `true`, reject with a 422/409 error — seller is already suspended. 5.
     *   Within a database transaction: a. Set `is_suspended = true` and update
     *   `updated_at = now()` on the `shopping_mall_sellers` record. b. The
     *   product visibility hiding is enforced at query time by filtering on the
     *   seller's `is_suspended` flag — no additional writes to product records
     *   are needed. 6. Return the updated seller record as
     *   `IShoppingMallSeller`. 7. Ensure all product listing queries (search,
     *   category browse) in the platform filter out products belonging to
     *   sellers with `is_suspended = true`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":sellerId/suspend")
  public async suspend(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSeller> {
    try {
      return await postShoppingMallSuperAdminSellersSellerIdSuspend({
        superAdmin,
        sellerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Lift the suspension from a seller account, restoring their full selling privileges on the platform.
   *
   * This operation allows administrators and super administrators to unsuspend a seller account that was previously suspended. The `shopping_mall_sellers` table tracks the suspension state via the `is_suspended` boolean column. When a seller is unsuspended, this flag is set back to `false`, immediately restoring the seller's products to visibility in search results and category listings, and re-enabling the seller's ability to create new products and edit existing ones.
   *
   * According to platform business rules, this operation is strictly gated on the current suspension state of the target seller. If the seller is not currently suspended (i.e., `is_suspended` is already `false`), the system rejects the request — administrators cannot unsuspend a seller who was never suspended or has already been restored. Likewise, if the seller account is banned (`is_banned = true`), this operation is also rejected, as the banned and suspended states are distinct and the ban takes precedence.
   *
   * Only authenticated administrators (`admin` or `superAdmin` role) are authorized to perform this action. Sellers and customers have no access to this endpoint. The operation is a targeted administrative intervention — no request body is required, as the action is completely determined by the target seller's identity in the path.
   *
   * Upon a successful unsuspension, all of the seller's non-deleted products are restored to public visibility. Customers can once again browse, add to cart, and purchase from this seller. The seller regains full product management capabilities, including the ability to create new products and edit existing listings.
   *
   * Related operations: Use `POST /sellers/{sellerId}/suspend` to suspend a seller account. Use `PATCH /sellers` to browse and filter the seller list. Use `GET /sellers/{sellerId}` to retrieve a seller's current status before taking administrative action.
   *
   * @param connection
   * @param sellerId The UUID of the seller account to unsuspend.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Extract `sellerId` (UUID) from the path
     *   parameter. 2. Authenticate the caller — must be an `admin` or
     *   `superAdmin`. Reject with 403 if not authorized. 3. Query
     *   `shopping_mall_sellers` WHERE `id = sellerId`. If not found, return
     *   404. 4. Check `is_suspended`: if `false`, reject the request with a
     *   422/409 error indicating the seller is not currently suspended. 5.
     *   Check `is_banned`: if `true`, reject the request with a 422/409 error
     *   indicating the seller is banned and cannot be unsuspended via this
     *   action. 6. Update `shopping_mall_sellers` SET `is_suspended = false`,
     *   `updated_at = NOW()` WHERE `id = sellerId`. 7. After the update,
     *   restore all non-deleted products belonging to this seller to
     *   visibility. This may involve clearing any suspension-driven hidden
     *   flags or simply relying on the `is_suspended` field being checked at
     *   query time for product listings. 8. Return the updated seller record as
     *   `IShoppingMallSeller` with the new `is_suspended = false` state
     *   reflected. 9. All steps should run within a database transaction to
     *   ensure atomicity.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":sellerId/unsuspend")
  public async unsuspend(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSeller> {
    try {
      return await postShoppingMallSuperAdminSellersSellerIdUnsuspend({
        superAdmin,
        sellerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
