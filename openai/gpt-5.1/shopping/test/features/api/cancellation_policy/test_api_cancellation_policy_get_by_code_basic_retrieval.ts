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
 * Basic retrieval of a cancellation policy by its business code.
 *
 * Business goal
 *
 * - Prove that a cancellation policy created via the platformAdmin endpoint
 *   becomes readable through the public GET
 *   /shoppingMall/cancellationPolicies/{cancellationPolicyCode} endpoint
 *   without any Authorization header.
 * - Ensure that all key business fields and system-managed identifiers/timestamps
 *   are consistent between the create response and the anonymous GET response.
 *
 * Flow
 *
 * 1. Join a new platform admin (POST /auth/platformAdmin/join) and rely on the SDK
 *    to attach the access token to the underlying connection.
 * 2. As the platform admin, create a new cancellation policy with clearly
 *    specified values so that we can assert them later.
 * 3. Clone the existing connection into a `publicConnection` that has an empty
 *    headers object, representing an anonymous caller.
 * 4. Call GET /shoppingMall/cancellationPolicies/{cancellationPolicyCode} using
 *    the business code of the created policy.
 * 5. Assert that the retrieved payload matches the created policy for all key
 *    fields (code, name, description, active, behavioral flags, timing window,
 *    and effective range) and that system-managed fields are present and
 *    unchanged (id, created_at, updated_at, deleted_at null).
 */
export async function test_api_cancellation_policy_get_by_code_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and establish authenticated session
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new cancellation policy as the platform admin
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveTo = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const createBody = {
    code: `CXL_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const created: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(created);

  // 3. Prepare an anonymous connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Retrieve the policy by its business code via public endpoint
  const fetched: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.cancellationPolicies.at(
      publicConnection,
      {
        cancellationPolicyCode: created.code,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(fetched);

  // 5. Validate that business fields are consistent between created and fetched
  TestValidator.equals(
    "cancellation policy code should match",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "cancellation policy name should match",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "cancellation policy description should match",
    fetched.description ?? null,
    created.description ?? null,
  );
  TestValidator.equals(
    "active flag should match",
    fetched.active,
    created.active,
  );
  TestValidator.equals(
    "allow_cancellation_before_shipment flag should match",
    fetched.allow_cancellation_before_shipment,
    created.allow_cancellation_before_shipment,
  );
  TestValidator.equals(
    "allow_partial_cancellation flag should match",
    fetched.allow_partial_cancellation,
    created.allow_partial_cancellation,
  );
  TestValidator.equals(
    "max_hours_after_payment should match",
    fetched.max_hours_after_payment ?? null,
    created.max_hours_after_payment ?? null,
  );
  TestValidator.equals(
    "effective_from should match",
    fetched.effective_from ?? null,
    created.effective_from ?? null,
  );
  TestValidator.equals(
    "effective_to should match",
    fetched.effective_to ?? null,
    created.effective_to ?? null,
  );

  // Region and policy setting associations should be consistent (both null here)
  TestValidator.equals(
    "region_setting association should match",
    fetched.region_setting ?? null,
    created.region_setting ?? null,
  );
  TestValidator.equals(
    "policy_setting association should match",
    fetched.policy_setting ?? null,
    created.policy_setting ?? null,
  );

  // 6. Validate system-managed fields consistency
  TestValidator.equals(
    "id should match between created and fetched",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "created_at should match between created and fetched",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at should match between created and fetched",
    fetched.updated_at,
    created.updated_at,
  );

  // Newly created policy should not be soft-deleted
  TestValidator.equals(
    "deleted_at should be null for newly created policy (created)",
    created.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null for newly created policy (fetched)",
    fetched.deleted_at ?? null,
    null,
  );
}
