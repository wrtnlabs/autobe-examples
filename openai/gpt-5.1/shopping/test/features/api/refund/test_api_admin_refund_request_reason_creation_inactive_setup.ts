import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Verify that an administrator can create a refund request reason in an
 * initially inactive state, with correct applicability flags and persisted
 * configuration fields.
 *
 * Business context:
 *
 * - Governance and operations teams manage a master list of standardized
 *   refund/cancellation reasons in `shopping_mall_refund_request_reasons`.
 * - Sometimes a reason needs to be prepared ahead of a policy rollout, so it must
 *   be created in an inactive state (`is_active = false`) and later activated.
 * - Reasons can be scoped to cancellations, refunds, or both via
 *   `applies_to_cancellation` and `applies_to_refund`.
 *
 * What this test validates:
 *
 * 1. An admin can be provisioned via POST /auth/admin/join, establishing an
 *    authenticated context for subsequent admin-only operations.
 * 2. The admin can call POST /shoppingMall/admin/refundRequestReasons with an
 *    `IShoppingMallRefundRequestReason.ICreate` payload that:
 *
 *    - Defines a unique `code`,
 *    - Provides a human readable `name` and `description`,
 *    - Sets `applies_to_cancellation = false` and `applies_to_refund = true`,
 *    - Sets `is_active = false` to keep the reason initially inactive.
 * 3. The response is a valid `IShoppingMallRefundRequestReason` object where:
 *
 *    - `code`, `name`, and `description` exactly match the request,
 *    - `applies_to_cancellation` and `applies_to_refund` mirror the request,
 *    - `is_active` is persisted as `false`,
 *    - `created_at` and `updated_at` are populated as ISO date-time strings.
 * 4. It captures in comments the behavioral contract that inactive reasons should
 *    not be surfaced in downstream UIs, while limiting runtime validation to
 *    creation semantics.
 */
export async function test_api_admin_refund_request_reason_creation_inactive_setup(
  connection: api.IConnection,
) {
  // 1. Provision an admin via /auth/admin/join to obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use null for IP to exercise the nullable field without worrying about
    // ipv4/ipv6 selection here.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // At this point, the SDK has injected the access token into connection.headers
  // and subsequent admin-only calls should succeed using this connection.

  // 2. Prepare an inactive refund-request-reason payload that only applies to refunds
  const reasonCodeBase = `damaged_item_refund_only_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: reasonCodeBase,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  // 3. Create the refund request reason via admin API
  const createdReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdReason);

  // 4. Validate that the core configuration fields are persisted as requested
  TestValidator.equals(
    "refund reason code should round-trip from create payload",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "refund reason name should match the requested name",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "refund reason description should match the requested description",
    createdReason.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "applies_to_cancellation flag should be preserved",
    createdReason.applies_to_cancellation,
    createBody.applies_to_cancellation,
  );
  TestValidator.equals(
    "applies_to_refund flag should be preserved",
    createdReason.applies_to_refund,
    createBody.applies_to_refund,
  );
  TestValidator.equals(
    "reason must be created in inactive state (is_active = false)",
    createdReason.is_active,
    false,
  );

  // Basic timestamp consistency checks – typia.assert has already validated
  // the date-time formats, so we only assert simple relational expectations.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    createdReason.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    createdReason.updated_at.length > 0,
  );
  TestValidator.equals(
    "for a freshly created record, created_at and updated_at should be equal or the same logical instant",
    createdReason.created_at,
    createdReason.updated_at,
  );

  // Behavioral expectation (documented only):
  // Future list/search endpoints that surface refund reasons to customers or
  // sellers should filter out reasons where `is_active === false` so that this
  // newly created configuration remains hidden until explicitly activated by
  // governance processes. That behavior will be covered by separate tests.
}
