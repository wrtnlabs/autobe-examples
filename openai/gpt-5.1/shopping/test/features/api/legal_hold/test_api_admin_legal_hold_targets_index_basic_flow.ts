import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHoldTarget";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Basic admin legal hold targets index flow.
 *
 * ## Business purpose
 *
 * Validates that the administrative legal hold targets listing endpoint (PATCH
 * /shoppingMall/admin/legalHolds/{legalHoldCode}/targets) works end-to-end when
 * an admin has:
 *
 * - Joined the system,
 * - Created a legal hold, and
 * - Attached at least one target to that legal hold.
 *
 * This confirms that governance/ compliance tooling can reliably enumerate
 * which concrete business entities (customers, sellers, orders, etc.) are
 * preserved under a given legal hold by its business code.
 *
 * ## End-to-end steps
 *
 * 1. Admin registration (join):
 *
 *    - Call POST /auth/admin/join via api.functional.auth.admin.join.
 *    - Use typia.random<IShoppingMallAdminJoin.ICreate>() for the request body to
 *         generate a realistic admin email/password and session metadata.
 *    - The SDK automatically sets connection.headers.Authorization from the returned
 *         IShoppingMallAdmin.IAuthorized.token.access, so no manual header
 *         management occurs in the test.
 * 2. Legal hold creation:
 *
 *    - Call POST /shoppingMall/admin/legalHolds via
 *         api.functional.shoppingMall.admin.legalHolds.create.
 *    - Build an explicit IShoppingMallLegalHold.ICreate body:
 *
 *         - Code: deterministic-ish unique string (e.g., based on random alphanumeric) to
 *                   reduce collision risk.
 *         - Title: simple string such as "Test legal hold for targets index".
 *         - Status: a reasonable lifecycle string like "active".
 *         - Description, scope_description, external_reference, effective_from: may be
 *                   omitted or set to null per DTO (the ICreate type marks them
 *                   as optional/nullable), but at least one may be populated
 *                   for realism.
 *    - Read the resulting IShoppingMallLegalHold.code; this is the business
 *         identifier used as {legalHoldCode} for subsequent target operations.
 * 3. Legal hold target creation:
 *
 *    - Call POST /shoppingMall/admin/legalHolds/{legalHoldCode}/targets via
 *         api.functional.shoppingMall.admin.legalHolds.targets.create.
 *    - Use the legalHoldCode from step 2.
 *    - Build an IShoppingMallLegalHoldTarget.ICreate body with:
 *
 *         - Target_type: a simple label such as "customer".
 *         - Target_id: a random UUID generated via typia.random<string &
 *                   tags.Format<"uuid">>().
 *         - Target_display: optional, e.g. "Customer under test".
 *         - Note: optional, e.g. "Created by E2E test".
 *    - Capture the resulting IShoppingMallLegalHoldTarget so the test can assert on
 *         its target_type and target_id when reading the index.
 * 4. Index (list) legal hold targets:
 *
 *    - Call PATCH /shoppingMall/admin/legalHolds/{legalHoldCode}/targets via
 *         api.functional.shoppingMall.admin.legalHolds.targets.index.
 *    - Use the same legalHoldCode.
 *    - Request body IShoppingMallLegalHoldTarget.IRequest should minimally set:
 *
 *         - Page: 1
 *         - Limit: 20
 *         - All other filter fields (target_type, target_id, created_from, created_to,
 *                   order_by, order_direction) are omitted so the query returns
 *                   all targets associated with that legal hold.
 * 5. Response validation:
 *
 *    - Assert the index response type with
 *         typia.assert<IPageIShoppingMallLegalHoldTarget.ISummary>().
 *    - Validate pagination using TestValidator.equals and TestValidator.predicate:
 *
 *         - Pagination.current === 1
 *         - Pagination.limit === 20
 *         - Pagination.records >= 1
 *         - Pagination.pages >= 1
 *    - If data array is non-empty (which it should be because we created at least
 *         one target):
 *
 *         - Take the first element data[0].
 *         - Assert that data[0].target_type === createdTarget.target_type.
 *         - Assert that data[0].target_id === createdTarget.target_id.
 *         - Created_at is already validated as a date-time via typia.assert, so no extra
 *                   regex/date parsing is necessary.
 *
 * ## Scope and exclusions
 *
 * - This test only covers the happy-path with a valid authorized admin and at
 *   least one target in a single legal hold.
 * - It does NOT test unauthenticated/unauthorized access, mis-typed request
 *   bodies, or other negative/edge error scenarios.
 * - It must not touch connection.headers directly; token handling is fully
 *   delegated to the SDK.
 * - It does not assert on raw HTTP status codes; success is inferred via
 *   successful resolution of the SDK call and valid response payloads.
 */
export async function test_api_admin_legal_hold_targets_index_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Legal hold creation
  const legalHoldCode: string = RandomGenerator.alphaNumeric(12);
  const legalHoldCreateBody = {
    code: legalHoldCode,
    title: "Test legal hold for targets index",
    status: "active",
    description: "E2E test legal hold used for listing targets.",
    scope_description: "Covers one synthetic customer entity for testing.",
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const createdLegalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(createdLegalHold);

  TestValidator.equals(
    "legal hold code in response should match request code",
    createdLegalHold.code,
    legalHoldCode,
  );

  // 3. Legal hold target creation
  const targetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const targetCreateBody = {
    target_type: "customer",
    target_id: targetId,
    target_display: "E2E customer target",
    note: "Created by admin legal hold targets index E2E test",
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const createdTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: createdLegalHold.code,
        body: targetCreateBody,
      },
    );
  typia.assert(createdTarget);

  TestValidator.equals(
    "created target_type should match request",
    createdTarget.target_type,
    targetCreateBody.target_type,
  );
  TestValidator.equals(
    "created target_id should match request",
    createdTarget.target_id,
    targetCreateBody.target_id,
  );

  // 4. Index (list) legal hold targets
  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const pageResult: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode: createdLegalHold.code,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination.current should be 1",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination.limit should be 20",
    pagination.limit,
    requestBody.limit,
  );

  TestValidator.predicate(
    "pagination.records should be at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1",
    pagination.pages >= 1,
  );

  TestValidator.predicate(
    "data array should contain at least one target",
    pageResult.data.length >= 1,
  );

  const first = pageResult.data[0];
  typia.assert(first);

  TestValidator.equals(
    "first listed target_type should match created target_type",
    first.target_type,
    createdTarget.target_type,
  );
  TestValidator.equals(
    "first listed target_id should match created target_id",
    first.target_id,
    createdTarget.target_id,
  );
}
