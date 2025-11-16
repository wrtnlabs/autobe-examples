import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate creation of an inactive cancellation policy by a platform admin.
 *
 * Business purpose: Ensure that platform administrators can define cancellation
 * policies in a “draft” or “staged” state by creating them with `active =
 * false`. Such policies must be fully stored and retrievable later, but must
 * not be considered active until explicitly toggled.
 *
 * Test steps:
 *
 * 1. Join as a fresh platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use random email, name, password, and session metadata (href, referrer).
 *    - Rely on the SDK’s automatic token handling: the returned access token is
 *         stored in `connection.headers.Authorization` by the client.
 * 2. With that authenticated connection, create a cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies using
 *    IShoppingMallCancellationPolicy.ICreate with:
 *
 *    - Unique `code` (e.g., prefix + random suffix).
 *    - Descriptive `name` string.
 *    - `allow_cancellation_before_shipment` and `allow_partial_cancellation` set to
 *         valid boolean values.
 *    - `active` explicitly set to false.
 *    - All other optional fields omitted so that the backend applies its defaults
 *         (null/undefined) for description, timing, and linking fields.
 * 3. Assert that the response is a valid IShoppingMallCancellationPolicy and that
 *    business invariants hold:
 *
 *    - `active === false`.
 *    - `code` and `name` echo the submitted values.
 *    - `id` is a non-empty UUID string.
 *    - `created_at` and `updated_at` are populated ISO date-time strings.
 *    - `deleted_at` is null or undefined for a brand-new record.
 *    - Optional scalar fields that were omitted in the request are either null or
 *         undefined in the response (according to DTO definitions):
 *         max_hours_after_payment, config_payload, effective_from,
 *         effective_to.
 *    - Optional association summaries region_setting and policy_setting are null or
 *         undefined when no linking codes are provided.
 *
 * Notes:
 *
 * - No follow-up read/list operation is performed because no such endpoint is
 *   provided; we trust the create response and typia.assert for the data
 *   contract.
 * - No error or edge-case testing is performed; this is a happy-path E2E
 *   verification of inactive policy creation semantics.
 */
export async function test_api_cancellation_policy_creation_inactive_policy(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authenticated context.
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional and can be omitted or set to null; here we omit it.
    href: "https://admin.example.com/join", // valid URI format string
    referrer: "https://example.com/landing", // valid URI format string
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a new cancellation policy with active = false.
  const codeSuffix = RandomGenerator.alphaNumeric(8);
  const policyCode = `inactive-policy-${codeSuffix}`;
  const policyName = `Inactive Policy ${codeSuffix}`;

  const createBody = {
    code: policyCode,
    name: policyName,
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    active: false,
    // Omit all optional fields so that backend uses defaults:
    // description, max_hours_after_payment, config_payload,
    // effective_from, effective_to, region_code, policy_setting_code.
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const created: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Business assertions.
  // Active flag must remain false for a draft/staged policy.
  TestValidator.equals(
    "cancellation policy is created as inactive",
    created.active,
    false,
  );

  // Basic echo checks for code and name.
  TestValidator.equals(
    "cancellation policy code echoes request",
    created.code,
    policyCode,
  );
  TestValidator.equals(
    "cancellation policy name echoes request",
    created.name,
    policyName,
  );

  // Server-managed identifiers and timestamps should be present.
  TestValidator.predicate(
    "cancellation policy id is non-empty UUID string",
    created.id.length > 0,
  );
  TestValidator.predicate(
    "cancellation policy created_at is non-empty",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "cancellation policy updated_at is non-empty",
    created.updated_at.length > 0,
  );

  // Freshly created policy should not be soft-deleted.
  TestValidator.predicate(
    "cancellation policy deleted_at is null or undefined on creation",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // Optional scalar fields omitted in request should be null/undefined.
  TestValidator.predicate(
    "max_hours_after_payment defaults to null/undefined",
    created.max_hours_after_payment === null ||
      created.max_hours_after_payment === undefined,
  );
  TestValidator.predicate(
    "config_payload defaults to null/undefined",
    created.config_payload === null || created.config_payload === undefined,
  );
  TestValidator.predicate(
    "effective_from defaults to null/undefined",
    created.effective_from === null || created.effective_from === undefined,
  );
  TestValidator.predicate(
    "effective_to defaults to null/undefined",
    created.effective_to === null || created.effective_to === undefined,
  );

  // Optional association summaries should be null/undefined when not linked.
  TestValidator.predicate(
    "region_setting is null/undefined when no region_code provided",
    created.region_setting === null || created.region_setting === undefined,
  );
  TestValidator.predicate(
    "policy_setting is null/undefined when no policy_setting_code provided",
    created.policy_setting === null || created.policy_setting === undefined,
  );
}
