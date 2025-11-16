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
 * Validate deletion behavior for non-existent cancellation policy codes.
 *
 * Business goal
 *
 * - Ensure that the platform admin DELETE endpoint for cancellation policies
 *   fails with a not-found style HTTP error when the target business code does
 *   not exist.
 * - Confirm that such a failed delete does not accidentally succeed or behave
 *   like an idempotent delete (HTTP 200/204), i.e. test that the system
 *   explicitly treats the situation as an error.
 *
 * Constraints from available SDK
 *
 * - Authentication: use api.functional.auth.platformAdmin.join to create a
 *   platform admin session. This call also wires the access token into
 *   connection.headers.Authorization automatically, so tests must not touch
 *   connection.headers directly.
 * - Policy creation: use
 *   api.functional.shoppingMall.platformAdmin.cancellationPolicies.create with
 *   IShoppingMallCancellationPolicy.ICreate as request body. Response is
 *   IShoppingMallCancellationPolicy.
 * - Deletion: use
 *   api.functional.shoppingMall.platformAdmin.cancellationPolicies.erase, which
 *   returns void and throws HttpError on failure.
 * - No list/read endpoint is provided, therefore we cannot explicitly re-fetch
 *   the created policy. We will instead focus on error semantics of the DELETE
 *   call with a non-existent code.
 *
 * Test steps
 *
 * 1. Join as a new platform admin
 *
 *    - Build a realistic IShoppingMallPlatformAdminJoin.IRequest:
 *
 *         - Email: random email (Format<"email">)
 *         - Name: random name string
 *         - Password: some random or static strong-ish string
 *         - Href/referrer: random uri strings (Format<"uri">)
 *    - Call api.functional.auth.platformAdmin.join(connection, { body }).
 *    - Assert the returned IShoppingMallPlatformAdmin.IAuthorized using typia.assert
 *         to guarantee type-correctness.
 * 2. Optionally create a valid cancellation policy
 *
 *    - Prepare IShoppingMallCancellationPolicy.ICreate body:
 *
 *         - Code: deterministic-looking random code (string) that follows a simple
 *                   pattern, e.g. `TEST-CANCEL-` +
 *                   RandomGenerator.alphaNumeric.
 *         - Name: RandomGenerator.name()
 *         - Description: RandomGenerator.paragraph() or null
 *         - Allow_cancellation_before_shipment: true
 *         - Allow_partial_cancellation: true
 *         - Max_hours_after_payment: some random or fixed small int32 or null
 *         - Config_payload: RandomGenerator.content() or null
 *         - Effective_from/effective_to: either null or a pair of ISO strings; to avoid
 *                   complex date-range business logic, they can be null.
 *         - Active: true
 *         - Region_code/policy_setting_code: null since we don’t have corresponding
 *                   creation APIs in this test.
 *    - Call create() and assert response with typia.assert.
 * 3. Attempt to delete a non-existent cancellation policy code
 *
 *    - Construct a clearly non-existent code, distinct from the created one. For
 *         example: `NONEXISTENT-` + RandomGenerator.alphaNumeric(16).
 *    - Call erase(connection, { cancellationPolicyCode: nonExistingCode }) inside
 *         TestValidator.httpError to validate that an HttpError is thrown with
 *         a 404-style status code.
 *    - Per global rules we must not assert exact HTTP status codes, so instead use
 *         TestValidator.error and only check that an error is thrown, not its
 *         status.
 * 4. Assertions
 *
 *    - Typia.assert on:
 *
 *         - IShoppingMallPlatformAdmin.IAuthorized result from join.
 *         - IShoppingMallCancellationPolicy result from create.
 *    - Use TestValidator.error with a descriptive title to ensure that the erase
 *         call with a non-existent code throws an error.
 *
 *         - DO NOT inspect HttpError.status explicitly, in line with the global
 *                   prohibition on status-code testing.
 *    - We cannot re-read the created policy, but the presence of an error instead of
 *         a silent success provides indirect evidence that the delete has not
 *         been applied to any real record.
 */
export async function test_api_cancellation_policy_delete_nonexistent_code_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a valid cancellation policy so the table is non-empty
  const baseCode = `TEST-CANCEL-${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: baseCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(createdPolicy);

  // 3. Try to delete a non-existent cancellation policy code
  const nonExistingCode = `NONEXISTENT-${RandomGenerator.alphaNumeric(16)}`;

  await TestValidator.error(
    "deleting non-existent cancellation policy must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.erase(
        connection,
        { cancellationPolicyCode: nonExistingCode },
      );
    },
  );

  // 4. Sanity check: ensure created policy is still a well-typed object
  //    (we cannot re-fetch it, but we can at least assert its structure again);
  typia.assert<IShoppingMallCancellationPolicy>(createdPolicy);
}
