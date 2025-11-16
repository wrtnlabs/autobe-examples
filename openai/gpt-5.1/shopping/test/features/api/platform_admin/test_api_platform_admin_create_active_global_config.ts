import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a newly joined platform administrator can create an active
 * global configuration entry in the checkout namespace.
 *
 * Business flow:
 *
 * 1. Join as a fresh platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use realistic random values for email, name, password, and session context
 *         (href, referrer).
 *    - Rely on the SDK to attach the JWT access token to the shared connection
 *         headers.
 * 2. Call POST /shoppingMall/platformAdmin/configs with a well-formed
 *    IShoppingMallConfig.ICreate payload:
 *
 *    - Namespace = "checkout".
 *    - Key = unique string like "max_cart_items_<random>" to avoid collisions.
 *    - Value = "100" (string representation of numeric threshold).
 *    - Description = meaningful non-empty text.
 *    - Active = true.
 * 3. Assert that the API responds successfully and that the response body matches
 *    IShoppingMallConfig (typia.assert).
 * 4. Verify business fields using TestValidator:
 *
 *    - Namespace and key exactly match the request.
 *    - Value is persisted unchanged.
 *    - Active is true.
 *    - Description is not null/undefined when we sent a non-null description.
 * 5. Verify system metadata fields:
 *
 *    - Id is a non-empty UUID string (typia.assert already enforces format; we only
 *         check non-emptiness).
 *    - Created_at and updated_at are present as non-empty ISO date-time strings
 *         (typia.assert enforces structure).
 *    - Deleted_at is null or undefined on creation.
 */
export async function test_api_platform_admin_create_active_global_config(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare configuration creation payload for checkout namespace
  const configKeySuffix = RandomGenerator.alphaNumeric(8);
  const createBody = {
    namespace: "checkout",
    key: `max_cart_items_${configKeySuffix}`,
    value: "100",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Business field validations
  TestValidator.equals(
    "namespace of created config matches request",
    createdConfig.namespace,
    createBody.namespace,
  );

  TestValidator.equals(
    "key of created config matches request",
    createdConfig.key,
    createBody.key,
  );

  TestValidator.equals(
    "value of created config matches request",
    createdConfig.value,
    createBody.value,
  );

  TestValidator.equals(
    "active flag of created config is true",
    createdConfig.active,
    true,
  );

  TestValidator.predicate(
    "description should be defined when provided in request",
    createdConfig.description !== null &&
      createdConfig.description !== undefined &&
      createdConfig.description.length > 0,
  );

  // 4. System field validations (basic sanity beyond typia.assert)
  TestValidator.predicate(
    "config id should be non-empty UUID string",
    createdConfig.id.length > 0,
  );

  TestValidator.predicate(
    "created_at should be non-empty",
    createdConfig.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be non-empty",
    createdConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined on creation",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );
}
