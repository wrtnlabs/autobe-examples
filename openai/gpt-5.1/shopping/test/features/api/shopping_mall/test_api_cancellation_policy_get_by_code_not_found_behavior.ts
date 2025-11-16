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
 * Validate not-found behavior of cancellation policy detail lookup by code.
 *
 * ## Business goal
 *
 * Ensure that the public GET
 * /shoppingMall/cancellationPolicies/{cancellationPolicyCode} endpoint behaves
 * correctly when a client requests a cancellation policy using a code that does
 * not exist in the system, even though other policies do exist. The endpoint
 * must fail with an HttpError-like response instead of returning a successful
 * 200 with a dummy or empty IShoppingMallCancellationPolicy object. The
 * endpoint is intended to be callable without authentication, so the not-found
 * behavior must be enforced for anonymous clients as well.
 *
 * ## High-level flow
 *
 * 1. Bootstrap a platform admin account using POST /auth/platformAdmin/join. This
 *    step validates that the join API is working and provides an authenticated
 *    connection in which the SDK automatically sets the Authorization header
 *    token.
 * 2. Using the authenticated connection, create a real cancellation policy via
 *    POST /shoppingMall/platformAdmin/cancellationPolicies with a well-formed
 *    IShoppingMallCancellationPolicy.ICreate payload. This ensures that the
 *    underlying table has at least one valid row and that the uniqueness of the
 *    `code` column is exercised in a normal success path.
 * 3. Construct a cancellationPolicyCode string that is guaranteed not to exist
 *    among policies we just created. Because the `code` column has a global
 *    uniqueness constraint and we control all codes we insert, we can simply
 *    generate a fresh random string that is distinct from the created policy's
 *    `code` (for example, "missing-" + RandomGenerator.alphaNumeric(16)).
 * 4. Create an unauthenticated connection object by shallow-cloning the original
 *    `connection` but overriding `headers` with an empty object. This simulates
 *    a completely anonymous caller, without touching the original
 *    connection.headers (which are controlled by the SDK).
 * 5. Call GET /shoppingMall/cancellationPolicies/{cancellationPolicyCode} using
 *    api.functional.shoppingMall.cancellationPolicies.at with the
 *    unauthenticated connection and the non-existent code.
 * 6. Verify that the above call fails by wrapping it in TestValidator.error with
 *    an async callback. We only assert that some error is thrown; we do NOT
 *    assert specific HTTP status codes or error payload shapes, in accordance
 *    with the testing constraints. The key behavior is that the endpoint does
 *    not quietly succeed for a non-existent code.
 * 7. As a positive control, call the same GET endpoint again, this time with the
 *    real existing policy code created in step 2, still using the
 *    unauthenticated connection. This should succeed:
 *
 *    - The call must return an IShoppingMallCancellationPolicy.
 *    - Typia.assert() must accept the response.
 *    - The `code` field of the returned policy must equal the created policy's
 *         `code`.
 * 8. Optionally, we can also probe a simple variant case such as altering the
 *    casing of the random non-existent code (e.g., uppercase version) and
 *    asserting that the lookup still fails, reinforcing that lookup semantics
 *    are strict with respect to the stored business code. However, we still
 *    avoid any assumptions about detailed error message content or HTTP status
 *    values.
 *
 * ## Validation strategy
 *
 * - Use typia.assert() to validate the structure of successful responses from
 *   platformAdmin.join and cancellationPolicies.create, as well as the
 *   successful detail fetch for the existing code.
 * - Use TestValidator.error with async closures to assert that requesting a
 *   non-existent code results in an error (HttpError thrown by the SDK),
 *   without inspecting status codes or message contents.
 * - Use TestValidator.equals with descriptive titles to ensure that the
 *   successful GET by existing code returns a policy whose `code` is exactly
 *   the one we created earlier.
 *
 * ## Technical constraints
 *
 * - All API calls must use `await`.
 * - Do not modify `connection.headers` directly after the SDK has set it;
 *   instead, create a cloned unauthenticated connection with `headers: {}` when
 *   simulating anonymous calls.
 * - Do not test type errors or invalid DTO shapes; all request bodies must
 *   satisfy their DTO types (IShoppingMallPlatformAdminJoin.IRequest and
 *   IShoppingMallCancellationPolicy.ICreate).
 * - Do not assert or depend on specific HTTP status codes for error responses;
 *   only assert that an error occurs for the non-existent code.
 */
export async function test_api_cancellation_policy_get_by_code_not_found_behavior(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a real cancellation policy via platformAdmin endpoint
  const createBody = {
    code: `policy-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: typia.random<number & tags.Type<"int32">>(),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const createdPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(createdPolicy);

  // 3. Build a guaranteed-nonexistent cancellation policy code
  const nonExistentCodeBase = `missing-${RandomGenerator.alphaNumeric(16)}`;
  const nonExistentCode =
    nonExistentCodeBase === createdPolicy.code
      ? `${nonExistentCodeBase}-x`
      : nonExistentCodeBase;

  // 4. Create an unauthenticated clone of the connection for public lookup
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5 & 6. Verify that requesting a non-existent code results in an error
  await TestValidator.error(
    "non-existent cancellation policy code must error",
    async () => {
      await api.functional.shoppingMall.cancellationPolicies.at(
        anonymousConnection,
        {
          cancellationPolicyCode: nonExistentCode,
        },
      );
    },
  );

  // 7. Positive control: fetching by existing code should succeed anonymously
  const fetchedExisting: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.cancellationPolicies.at(
      anonymousConnection,
      { cancellationPolicyCode: createdPolicy.code },
    );
  typia.assert<IShoppingMallCancellationPolicy>(fetchedExisting);

  TestValidator.equals(
    "fetched existing policy must have the same code as created policy",
    fetchedExisting.code,
    createdPolicy.code,
  );
}
