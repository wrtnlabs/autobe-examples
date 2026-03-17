import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallAdmin } from "../../../../api/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "../../../../api/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "../../../../api/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallSuperAdmin } from "../../../../api/structures/IShoppingMallSuperAdmin";
import { SuperadminAuth } from "../../../../decorators/SuperadminAuth";
import { SuperadminPayload } from "../../../../decorators/payload/SuperadminPayload";
import { getShoppingMallSuperAdminAdminsAdminId } from "../../../../providers/getShoppingMallSuperAdminAdminsAdminId";
import { getShoppingMallSuperAdminAdminsAdminIdOfCustomer } from "../../../../providers/getShoppingMallSuperAdminAdminsAdminIdOfCustomer";
import { patchShoppingMallSuperAdminAdmins } from "../../../../providers/patchShoppingMallSuperAdminAdmins";
import { postShoppingMallSuperAdminAdminsAdminIdPromote } from "../../../../providers/postShoppingMallSuperAdminAdminsAdminIdPromote";
import { putShoppingMallSuperAdminAdminsAdminId } from "../../../../providers/putShoppingMallSuperAdminAdminsAdminId";

@Controller("/shoppingMall/superAdmin/admins")
export class ShoppingmallSuperadminAdminsController {
  /**
   * Retrieve a paginated, filtered list of administrator accounts registered on the shopping mall platform.
   *
   * This operation allows authenticated administrators (both regular and super) to browse and search the full list of administrator accounts on the platform. It provides flexible filtering, sorting, and pagination capabilities to support administrator management workflows.
   *
   * The underlying data is sourced from the `shopping_mall_admins` table, which stores regular administrator accounts. Each admin account is promoted from an existing customer or seller account through the admin request and approval process. The `actor_type` field indicates whether the administrator's originating account was a customer or a seller. Super administrators are stored in a separate `shopping_mall_super_admins` table; the grade (regular vs. super) is derived by cross-referencing these two tables.
   *
   * Supported filtering options include: partial email search, administrator grade (regular or super), origin type (customer-originated or seller-originated), account status (active or including deactivated accounts), and creation date ranges. Results can be sorted by creation date, email, or last updated date.
   *
   * Sensitive fields such as password hashes are never included in the response. Only safe, non-credential fields are returned in the summary representation — including the administrator's unique ID, email, actor type, grade, account status, and timestamps.
   *
   * This operation is restricted to authenticated admin and super admin actors. Customers, sellers, and unauthenticated guests are not permitted to access this list. Use `GET /admins/{adminId}` to retrieve detailed information about a specific administrator.
   *
   * @param connection
   * @param body Search criteria, filtering options, and pagination parameters for listing administrators
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification Query the shopping_mall_admins table with pagination and filtering.
   *
   * 1. Authorization: Verify the requesting actor is an authenticated admin or super admin (check active session via shopping_mall_admin_sessions or shopping_mall_super_admin_sessions). Deny access for customers, sellers, and guests.
   *
   * 2. Filtering logic:
   *    - Filter by email (partial/case-insensitive match if provided)
   *    - Filter by actor_type origin ('customer' or 'seller') if provided
   *    - Filter by grade ('regular' or 'super'): for 'super', join/cross-check against shopping_mall_super_admins by email; for 'regular', exclude those appearing in shopping_mall_super_admins
   *    - Filter by active/deleted status: if not specified, return only active (deleted_at IS NULL) accounts by default; allow filtering to include or show only deleted accounts
   *    - Filter by created_at date range (from/to) if provided
   *
   * 3. Pagination: Apply cursor-based or offset-based pagination. Return total count, current page, page size.
   *
   * 4. Sorting: Support sorting by created_at (default DESC), email, updated_at.
   *
   * 5. Response mapping: Map each admin record to IShoppingMallAdmin.ISummary, including: id, email, actor_type, grade (derived by checking super admin tables), created_at, updated_at. NEVER include password_hash in the response.
   *
   * 6. Edge cases:
   *    - If no admins match the filter, return an empty data array with pagination metadata.
   *    - If deleted_at is non-null and the filter does not include deleted accounts, exclude from results.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedBody()
    body: IShoppingMallAdmin.IRequest,
  ): Promise<IPageIShoppingMallAdmin.ISummary> {
    try {
      return await patchShoppingMallSuperAdminAdmins({
        superAdmin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the full profile of a specific regular administrator account by their unique identifier.
   *
   * This operation looks up a single administrator record from the `shopping_mall_admins` table using the provided `adminId` (UUID). The administrator entity stores the login email, account grade (regular or super administrator), the discriminator for the originating account type (`actor_type`: either `'customer'` or `'seller'`), and lifecycle timestamps (`created_at`, `updated_at`, `deleted_at`).
   *
   * Administrator accounts are not independently registered — every admin originates from a pre-existing customer or seller account that was granted administrator status through the admin request and approval process. This origin is tracked via the subtype linkage tables `shopping_mall_admin_of_customers` and `shopping_mall_admin_of_sellers`. The response includes this origin context so authorized viewers can trace the admin's provenance.
   *
   * Access to this endpoint is restricted exclusively to actors holding at minimum regular administrator privileges. Customers, sellers, and unauthenticated guests are denied access, as administrator identity information is considered sensitive platform-management data.
   *
   * If the `deleted_at` field on the returned record is non-null, the administrator account has been deactivated and the account can no longer be used to authenticate on the platform. The historical record is preserved for audit purposes and remains visible to other administrators.
   *
   * This endpoint is typically used by the administrator management interface to display the details of a particular admin, or by a super administrator when reviewing administrator accounts for grade management or promotion decisions. To retrieve a paginated list of administrators, use `PATCH /admins` instead.
   *
   * @param connection
   * @param adminId The UUID of the target administrator record to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authenticate the caller and verify they hold at least a regular administrator or super administrator role. Reject with 403 if the caller is a customer, seller, or unauthenticated guest.
   *
   * 2. Query shopping_mall_admins WHERE id = :adminId. If no record is found, return 404.
   *
   * 3. If the admin record has deleted_at IS NOT NULL, still return the record (admins viewing another admin's deactivated account is valid for audit purposes), but include the deleted_at timestamp in the response so the caller can recognize the account is deactivated.
   *
   * 4. Based on the actor_type column ('customer' or 'seller'), join the corresponding subtype linkage table:
   *    - If actor_type = 'customer': JOIN shopping_mall_admin_of_customers ON admin_id = admins.id to retrieve the originating customer_id and created_at of the promotion.
   *    - If actor_type = 'seller': JOIN shopping_mall_admin_of_sellers ON admin_id = admins.id to retrieve the originating seller_id and created_at of the promotion.
   *
   * 5. Check whether a corresponding record exists in shopping_mall_super_admins with the same email (or via a join through the promotion chain) to determine the grade ('regular' or 'super'). Alternatively, if the system tracks grade on the admin record itself, read it directly.
   *
   * 6. Assemble and return the IShoppingMallAdmin response DTO including: id, email, actor_type, grade, created_at, updated_at, deleted_at, and origin linkage details (originating customer_id or seller_id and promotion timestamp).
   *
   * 7. Never return password_hash in the response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":adminId")
  public async at(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("adminId")
    adminId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdmin> {
    try {
      return await getShoppingMallSuperAdminAdminsAdminId({
        superAdmin,
        adminId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the profile information of an existing regular administrator account.
   *
   * This operation allows a super administrator to modify a regular administrator's updatable profile fields, specifically the email address and password. The target administrator is identified by their unique UUID (`adminId`), which corresponds to the primary key of the `shopping_mall_admins` table. Only fields that are user-managed — such as `email` and `password` — may be changed through this endpoint. System-managed fields such as `actor_type`, `created_at`, and `deleted_at` are not modifiable via this operation.
   *
   * The `email` field in `shopping_mall_admins` is marked as unique and serves as the login identifier for the administrator. If an email update is requested, the system must verify that the new email address is not already in use by another administrator account before applying the change. The `password_hash` field stores a bcrypt-hashed password; callers submit the new plaintext password which the service layer hashes before persisting.
   *
   * Access to this endpoint is restricted exclusively to authenticated super administrators. Only super administrators may update a regular administrator's profile. Unauthenticated requests and requests from regular administrators are denied.
   *
   * The `updated_at` timestamp on the `shopping_mall_admins` record is automatically refreshed to the current timestamp whenever this operation completes successfully, preserving an accurate audit trail of when the account was last modified.
   *
   * Related operations: Use `GET /shoppingMall/superAdmin/admins/{adminId}` to retrieve the current profile of an administrator before performing an update. Use `DELETE /shoppingMall/superAdmin/admins/{adminId}` or a dedicated deactivation endpoint to manage account deactivation (which sets the `deleted_at` field).
   *
   * @param connection
   * @param adminId The unique UUID identifier of the target regular administrator account to update. Corresponds to shopping_mall_admins.id.
   * @param body Fields to update on the administrator account (email and/or password).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authenticate the caller. Verify that the requester is an active administrator (either regular or super) by checking their session token against shopping_mall_admin_sessions or shopping_mall_super_admin_sessions.
   * 2. Parse the path parameter `adminId` as a UUID and query the shopping_mall_admins table for a record with matching `id`. If no record is found or the record has a non-null `deleted_at`, return a 404 Not Found error.
   * 3. Authorize the caller:
   *    - If the caller is a regular admin, verify that their own admin `id` matches the target `adminId`. If not, return a 403 Forbidden error.
   *    - If the caller is a super admin, they may update any admin's profile without ownership restriction.
   * 4. Extract updatable fields from the request body (IShoppingMallAdmin.IUpdate): `email` and/or `password`.
   * 5. If a new `email` is provided:
   *    - Check that it differs from the current email (skip if unchanged).
   *    - Query shopping_mall_admins for any existing record with the same email (excluding the current admin). If a conflict is found, return a 409 Conflict error.
   * 6. If a new `password` is provided:
   *    - Hash the plaintext password using bcrypt with an appropriate cost factor.
   *    - Set `password_hash` to the resulting hash.
   * 7. Apply all validated changes to the shopping_mall_admins record in a single atomic database update, refreshing `updated_at` to the current UTC timestamp.
   * 8. Reload the updated admin record and return it as IShoppingMallAdmin in the response body.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":adminId")
  public async update(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("adminId")
    adminId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallAdmin.IUpdate,
  ): Promise<IShoppingMallAdmin> {
    try {
      return await putShoppingMallSuperAdminAdminsAdminId({
        superAdmin,
        adminId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the customer-origin linkage record for a specific regular administrator.
   *
   * This operation returns the `shopping_mall_admin_of_customers` subtype record that links a regular administrator account to the originating customer account from which it was promoted. Every regular administrator on the shopping mall platform who was promoted from a customer account has exactly one such record, establishing a traceable 1:1 relationship between the admin identity and the customer identity that preceded it.
   *
   * As described in the `shopping_mall_admin_of_customers` schema, each record captures the `admin_id` (referencing `shopping_mall_admins`), the `customer_id` (referencing `shopping_mall_customers`), and the `created_at` timestamp indicating when the promotion linkage was recorded. The unique constraints on both `admin_id` and `customer_id` ensure that a single customer can only be promoted once through the customer pathway, and that each admin has at most one customer origin.
   *
   * This endpoint is part of the administrative governance layer of the platform. It is intended for use by administrators who need to trace the origin of another admin's account — for example, to verify an admin's background or resolve identity questions during an audit. Because of the sensitive nature of this data, only authenticated administrators (regular or super) are permitted to call this endpoint.
   *
   * If the specified administrator did not originate from a customer account (i.e., they were promoted from a seller account instead), this endpoint will return a not-found response, since no `shopping_mall_admin_of_customers` record will exist for that admin. To retrieve the seller-origin linkage for an admin promoted from a seller, use the corresponding `/admins/{adminId}/ofSeller` endpoint.
   *
   * Pre-requisite: The target admin account must exist in `shopping_mall_admins` and must not have been deactivated via `deleted_at`. Callers should use `PATCH /admins` to obtain the list of admin accounts before accessing individual admin details.
   *
   * @param connection
   * @param adminId The UUID of the regular administrator account whose customer-origin linkage is being retrieved. Corresponds to shopping_mall_admins.id.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Validate that the caller is an authenticated administrator (regular or super) by checking the session token.
   * 2. Look up the admin record in `shopping_mall_admins` by `adminId` (UUID). If no admin with that ID exists, or if the admin's `deleted_at` is non-null, return 404 Not Found.
   * 3. Query `shopping_mall_admin_of_customers` WHERE `admin_id = adminId`. If no record is found (because the admin was promoted from a seller, not a customer), return 404 Not Found.
   * 4. Return the found `shopping_mall_admin_of_customers` record, joined with the originating `shopping_mall_customers` record (id, email, nickname) for consumer convenience. Include: id, admin_id, customer_id, created_at, and optionally the referenced customer's summary fields.
   * 5. No pagination, filtering, or sorting needed — this is always a single record lookup.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":adminId/ofCustomer")
  public async ofCustomer(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("adminId")
    adminId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdminOfCustomer> {
    try {
      return await getShoppingMallSuperAdminAdminsAdminIdOfCustomer({
        superAdmin,
        adminId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Promote a regular administrator to the super administrator grade.
   *
   * This operation elevates an existing regular administrator account to the super administrator tier, granting them all additional privileges associated with the super administrator role. Upon successful promotion, the target administrator gains the ability to approve or reject administrator promotion requests, promote other regular administrators to super administrator, and demote other super administrators back to regular administrator.
   *
   * This action is exclusively available to super administrators. Regular administrators are strictly forbidden from invoking this endpoint. If a regular administrator attempts to call this operation, the system will reject the request and preserve the target account's current grade without modification.
   *
   * The target administrator is identified by the `adminId` path parameter, which corresponds to the `id` primary key column of the `shopping_mall_admins` table. The target account must currently hold the regular administrator grade. Attempting to promote an administrator who is already a super administrator will result in a rejection — the system enforces idempotency protection to prevent redundant grade-change actions.
   *
   * Upon successful promotion, the system immediately reflects the grade change — no approval queue or secondary confirmation step is involved. The newly promoted super administrator can immediately exercise all super-administrator-only capabilities.
   *
   * Related operations:
   * - `POST /admins/{adminId}/demote` — Demotes a super administrator back to regular administrator grade (super admin only, self-demotion prohibited).
   * - `PATCH /admins` — Lists administrators with their current grade information, useful for identifying eligible candidates for promotion.
   *
   * @param connection
   * @param adminId The UUID primary key of the target regular administrator account (from shopping_mall_admins.id) to be promoted to super administrator.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authorization check: Verify that the authenticated actor is a super administrator (shopping_mall_super_admins record exists and account is active, i.e., deleted_at IS NULL). If the caller is a regular admin, return 403 Forbidden.
   *
   * 2. Resolve target admin: Look up the shopping_mall_admins record by `adminId` (UUID). If not found or deleted_at IS NOT NULL, return 404 Not Found.
   *
   * 3. Grade check: Determine if the target admin is currently a regular admin (i.e., no corresponding active shopping_mall_super_admins record exists for the originating email or linked account). If they are already a super administrator, return 409 Conflict with a message indicating the target is already a super administrator.
   *
   * 4. Promotion logic: Within a database transaction:
   *    a. Create a new record in the `shopping_mall_super_admins` table, copying over the email and password_hash from the shopping_mall_admins record (or as per the system's promotion mechanism — creating the super admin record linked to the same originating account).
   *    b. Optionally mark or deactivate the regular admin record (set deleted_at if the system models admin grades as exclusive — confirm with schema). If the system maintains both records and uses grade as a flag, update accordingly.
   *    c. Set created_at and updated_at timestamps.
   *
   * 5. Return the newly created/updated IShoppingMallSuperAdmin object representing the promoted account.
   *
   * 6. Edge cases:
   *    - Caller self-promotion: If a super admin attempts to promote themselves (their own adminId maps back to their super admin account), treat as 409 (already super admin).
   *    - Race condition: Use a database transaction with appropriate locking to prevent double-promotion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":adminId/promote")
  public async promote(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("adminId")
    adminId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSuperAdmin> {
    try {
      return await postShoppingMallSuperAdminAdminsAdminIdPromote({
        superAdmin,
        adminId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
