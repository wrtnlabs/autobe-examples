import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCustomer } from "../../../../api/structures/IPageIShoppingMallCustomer";
import { IShoppingMallCustomer } from "../../../../api/structures/IShoppingMallCustomer";
import { SuperadminAuth } from "../../../../decorators/SuperadminAuth";
import { SuperadminPayload } from "../../../../decorators/payload/SuperadminPayload";
import { getShoppingMallSuperAdminCustomersCustomerId } from "../../../../providers/getShoppingMallSuperAdminCustomersCustomerId";
import { patchShoppingMallSuperAdminCustomers } from "../../../../providers/patchShoppingMallSuperAdminCustomers";
import { postShoppingMallSuperAdminCustomersCustomerIdBan } from "../../../../providers/postShoppingMallSuperAdminCustomersCustomerIdBan";
import { postShoppingMallSuperAdminCustomersCustomerIdUnban } from "../../../../providers/postShoppingMallSuperAdminCustomersCustomerIdUnban";
import { putShoppingMallSuperAdminCustomersCustomerId } from "../../../../providers/putShoppingMallSuperAdminCustomersCustomerId";

@Controller("/shoppingMall/superAdmin/customers")
export class ShoppingmallSuperadminCustomersController {
  /**
   * Retrieve a paginated and filtered list of all registered customer accounts on the shopping mall platform.
   *
   * This operation allows administrators and super administrators to search through the entire customer base with advanced filtering capabilities. It provides a comprehensive view of all customer accounts, including their profile information, account status, and registration details.
   *
   * The underlying data is sourced from the `shopping_mall_customers` table, which stores the root actor entity for the customer role. Each customer record contains a unique email address used as the login identifier, a display nickname, an optional phone number, and a ban status flag indicating whether the account has been restricted by an administrator.
   *
   * Search and filter capabilities include:
   * - **Nickname search**: Partial text matching powered by the GIN trigram index (`gin_trgm_ops`) on the `nickname` column, enabling efficient fuzzy/partial name lookups.
   * - **Email filter**: Exact or partial match filtering on the customer's unique email address.
   * - **Ban status filter**: Filter by whether the customer account is currently banned (`is_banned` column).
   * - **Registration date range**: Filter customers by their `created_at` timestamp to narrow results to a specific registration period.
   * - **Pagination and sorting**: Results are paginated with configurable page size and support sorting by registration date or nickname.
   *
   * Only administrators (`admin`) and super administrators (`superAdmin`) are authorized to call this endpoint. Individual customers cannot list other customers' accounts, as customer data is private and isolated per account.
   *
   * This endpoint is typically used in the admin dashboard for customer management tasks such as reviewing accounts, identifying banned customers, or auditing registration activity over a time period. Use `GET /customers/{customerId}` to retrieve the full detail of a specific customer after identifying them in this list.
   *
   * @param connection
   * @param body Search criteria, filter options, and pagination parameters for listing customer accounts
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authorization: Verify the caller has admin or superAdmin role. Reject unauthenticated or customer/seller requests with 403.
   *
   * 2. Query construction:
   *    - Base query: SELECT from shopping_mall_customers WHERE deleted_at IS NULL.
   *    - Apply nickname filter: if request.nickname is provided, use trigram similarity search (ILIKE '%nickname%' or pg_trgm similarity) leveraging the GIN index on nickname column.
   *    - Apply email filter: if request.email is provided, apply ILIKE '%email%' filter on the email column.
   *    - Apply is_banned filter: if request.isBanned is provided (boolean), add WHERE is_banned = request.isBanned.
   *    - Apply createdAt range: if request.createdAt.from is provided, add WHERE created_at >= from; if request.createdAt.to is provided, add WHERE created_at <= to.
   *
   * 3. Sorting:
   *    - Support sorting by: created_at (default, DESC), nickname (ASC/DESC).
   *    - Apply ORDER BY based on request.sort and request.order fields.
   *
   * 4. Pagination:
   *    - Use offset-based pagination with request.page (1-indexed) and request.limit (items per page, default 20, max 100).
   *    - Calculate total count via COUNT(*) with same filters applied.
   *    - Return IPage structure with pagination metadata: total, page, limit, pages.
   *
   * 5. Projection:
   *    - Return ISummary fields: id, email, nickname, phone, is_banned, created_at, updated_at (exclude password_hash for security).
   *
   * 6. Edge cases:
   *    - If no customers match the filters, return empty data array with correct pagination metadata.
   *    - Ensure password_hash is NEVER included in any response projection.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedBody()
    body: IShoppingMallCustomer.IRequest,
  ): Promise<IPageIShoppingMallCustomer.ISummary> {
    try {
      return await patchShoppingMallSuperAdminCustomers({
        superAdmin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single customer account by its unique identifier.
   *
   * This operation returns the complete profile details of a registered customer account stored in the `shopping_mall_customers` table. The response includes all publicly relevant customer attributes such as the email address, display nickname, phone number, account ban status, and account lifecycle timestamps.
   *
   * This endpoint is intended for use by super administrators who need to inspect specific customer accounts for moderation, support, or oversight purposes. Super administrators can retrieve any customer's details by providing their unique UUID identifier, regardless of the customer's current account status (active, banned, or deleted).
   *
   * The `shopping_mall_customers` table uniquely identifies each customer by their email address (`@@unique([email])`). Each customer account carries an `is_banned` flag that indicates whether the customer has been banned by an administrator, which would restrict them from logging in or accessing any member-only features. The `deleted_at` field tracks whether the account has been removed — deleted accounts remain accessible to super administrators and may still be referenced by historical orders and reviews.
   *
   * Sensitive authentication information such as `password_hash` is never included in any API response. The response only exposes safe, non-sensitive profile fields.
   *
   * This operation complements the paginated customer list endpoint, which returns summarized customer records. Once a specific customer of interest is identified from the list, their full details can be retrieved using this endpoint.
   *
   * @param connection
   * @param customerId The UUID of the target customer account to retrieve (global scope, primary key of shopping_mall_customers).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Extract `customerId` from the path parameter and validate it as a UUID format.
   * 2. Query the `shopping_mall_customers` table for a record where `id = customerId`.
   * 3. If no record is found (including records where `deleted_at IS NOT NULL` if the business rule excludes deleted accounts), return a 404 Not Found error.
   * 4. Map the found record to the `IShoppingMallCustomer` response DTO, including: `id`, `email`, `nickname`, `phone` (nullable), `is_banned`, `created_at`, `updated_at`, `deleted_at` (nullable).
   * 5. Explicitly EXCLUDE `password_hash` from the response — it must never be exposed.
   * 6. Return the assembled DTO as the response body with HTTP 200 OK.
   * 7. Authorization: only admin and superAdmin actors are permitted to call this endpoint. Reject unauthorized callers with HTTP 403 Forbidden.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":customerId")
  public async at(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("customerId")
    customerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCustomer> {
    try {
      return await getShoppingMallSuperAdminCustomersCustomerId({
        superAdmin,
        customerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the profile information of an existing customer account.
   *
   * This operation allows an authenticated customer to modify their own mutable profile attributes stored in the `shopping_mall_customers` table. Specifically, customers may update their display nickname shown publicly on the platform (e.g., in product reviews) and their optional contact phone number.
   *
   * Only the owning customer may update their own profile. A customer cannot update another customer's profile — the `customerId` in the path must match the authenticated customer's identity. Attempting to modify another customer's record will result in a forbidden error.
   *
   * The following fields are intentionally excluded from this update operation and cannot be changed through this endpoint: `email` (the login identifier), `password_hash` (password changes require a dedicated password change flow), and `is_banned` (this flag is exclusively managed by administrators). The `created_at`, `updated_at`, and `deleted_at` timestamps are managed entirely by the system.
   *
   * The underlying `shopping_mall_customers` record is located by the `customerId` path parameter, which must be a valid UUID corresponding to an existing, non-deleted customer account. If the customer account has been banned or deleted, the operation will be rejected.
   *
   * Upon successful update, the operation returns the complete, updated customer entity reflecting the new profile values. Callers may use this response to update any locally cached customer profile data without requiring an additional GET request.
   *
   * Related operations:
   * - `GET /customers/{customerId}` should be called first to retrieve the current profile state before presenting an edit form to the user.
   * - `PUT /customers/{customerId}/password` handles password changes as a separate, security-sensitive operation.
   *
   * @param connection
   * @param customerId The UUID of the customer account to update. Must match the authenticated customer's own ID.
   * @param body Updated profile information for the customer, including nickname and optional phone number.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Extract `customerId` from the path and validate it is a valid UUID format.
   * 2. Authenticate the requesting customer from the JWT session token.
   * 3. Verify that the authenticated customer's ID matches the `customerId` path parameter. If they do not match, return HTTP 403 Forbidden.
   * 4. Retrieve the customer record from `shopping_mall_customers` where `id = customerId` AND `deleted_at IS NULL`. If not found, return HTTP 404 Not Found.
   * 5. Verify the customer is not banned (`is_banned = false`). If banned, return HTTP 403 Forbidden.
   * 6. Validate the request body fields:
   *    - `nickname`: required string, must not be empty, enforce any max-length constraint (e.g., 100 characters).
   *    - `phone`: optional string or null; if provided, validate format.
   * 7. Execute an UPDATE statement on `shopping_mall_customers` setting `nickname`, `phone`, and `updated_at = NOW()` where `id = customerId`.
   * 8. Fetch and return the updated `shopping_mall_customers` record, mapped to the `IShoppingMallCustomer` response DTO. Exclude `password_hash` from the response for security.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":customerId")
  public async update(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("customerId")
    customerId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCustomer.IUpdate,
  ): Promise<IShoppingMallCustomer> {
    try {
      return await putShoppingMallSuperAdminCustomersCustomerId({
        superAdmin,
        customerId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Ban a specific customer account by its unique identifier, immediately preventing that customer from logging in to the platform.
   *
   * This operation is restricted to administrators (both regular and super administrators). When an administrator issues a ban on a customer account, the system immediately sets the `is_banned` flag on the corresponding `shopping_mall_customers` record to `true`, and any active sessions belonging to that customer are invalidated. From the moment the ban takes effect, the banned customer cannot authenticate or access any member-only feature on the platform.
   *
   * The `shopping_mall_customers` table stores the `is_banned` boolean column that governs this restriction. The `updated_at` timestamp is refreshed to record when the ban was applied. The customer's `email`, `nickname`, order history, addresses, wishlist, and all other associated data remain fully intact — the ban only restricts login access, not the underlying data records.
   *
   * Existing orders placed by the customer before the ban are completely unaffected. Sellers associated with those orders can continue to process them normally, and administrators can continue to view and manage them through the platform's oversight tools.
   *
   * If the target customer account is already in a banned state (i.e., `is_banned` is already `true`), the system will reject this request to prevent duplicate ban operations, as specified by platform business rules.
   *
   * If the target customer account does not exist or has been deleted (`deleted_at` is non-null), the system returns an appropriate not-found error.
   *
   * Related operations: Use `DELETE /customers/{customerId}/ban` to lift the ban and restore the customer's login access. Use `GET /customers/{customerId}` to retrieve the current account status and verify the ban state.
   *
   * @param connection
   * @param customerId The unique identifier (UUID) of the customer account to be banned.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authenticate the requesting actor and verify it holds administrator-level privileges (admin or superAdmin). Reject with 403 Forbidden if not.
   * 2. Look up the shopping_mall_customers record by the given customerId (UUID). If not found or deleted_at is non-null, return 404 Not Found.
   * 3. Check the current is_banned value. If is_banned is already true, reject the request with 409 Conflict (duplicate ban attempt, per business rule in section [439]).
   * 4. Within a database transaction:
   *    a. UPDATE shopping_mall_customers SET is_banned = true, updated_at = NOW() WHERE id = :customerId.
   *    b. Invalidate all active customer sessions by deleting or expiring records in shopping_mall_customer_sessions that belong to this customer.
   * 5. Return the full updated shopping_mall_customers record as IShoppingMallCustomer.
   * 6. Edge cases:
   *    - Race condition: use row-level locking (SELECT FOR UPDATE) when reading the is_banned field to prevent concurrent duplicate bans.
   *    - The customer's historical orders, addresses, cart items, wishlist items, and reviews must NOT be modified.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":customerId/ban")
  public async ban(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("customerId")
    customerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCustomer> {
    try {
      return await postShoppingMallSuperAdminCustomersCustomerIdBan({
        superAdmin,
        customerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Restore a banned customer account's ability to log in to the platform.
   *
   * This operation allows any administrator (regular or super) to remove a ban that was previously placed on a customer account. Upon successful unbanning, the customer immediately regains their ability to log in and access all member-only features of the platform, including shopping, account management, wishlist, cart, and order history.
   *
   * The target customer is identified by their unique UUID (`customerId`). The system retrieves the corresponding record from the `shopping_mall_customers` table and checks the `is_banned` flag. If the customer is already active (not banned), the system rejects the request with an appropriate error, as unbanning a non-banned account is not permitted.
   *
   * This operation is restricted to authenticated administrators only — both regular and super administrators have authority to unban customer accounts. Unauthenticated guests, registered customers, and sellers are not permitted to invoke this endpoint.
   *
   * Existing orders, reviews, wishlist items, cart items, and other data associated with the customer account are not affected by the unban action — all prior records remain intact and accessible once the customer logs back in.
   *
   * Before calling this endpoint, administrators can use `PATCH /customers` to retrieve the list of customer accounts and identify which ones are currently banned, then use the `customerId` from those results to target this operation.
   *
   * @param connection
   * @param customerId The unique UUID identifier of the customer account to unban.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authenticate the caller and verify they hold an admin or superAdmin role. Reject with 403 Forbidden if not.
   * 2. Look up the shopping_mall_customers record by the provided customerId (UUID). Return 404 Not Found if no record exists or if the record has a non-null deleted_at.
   * 3. Check the is_banned field on the customer record. If is_banned is false, reject with a 409 Conflict (or 422 Unprocessable Entity) error indicating the customer is not currently banned and cannot be unbanned.
   * 4. Update the shopping_mall_customers record: set is_banned = false and update updated_at to the current timestamp.
   * 5. Commit the transaction.
   * 6. Return the updated customer record as IShoppingMallCustomer in the response body so the administrator can confirm the change.
   * 7. Edge cases: handle concurrent unban requests gracefully (idempotency check after lock if needed); ensure the response reflects the current state post-update.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":customerId/unban")
  public async unban(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("customerId")
    customerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCustomer> {
    try {
      return await postShoppingMallSuperAdminCustomersCustomerIdUnban({
        superAdmin,
        customerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
