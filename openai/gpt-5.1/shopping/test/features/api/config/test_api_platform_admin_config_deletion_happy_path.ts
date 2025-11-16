import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Happy-path test for hard deletion of a platform admin configuration.
 *
 * Business purpose: Ensure that a platform administrator can:
 *
 * 1. Join the platform and obtain an authorized session,
 * 2. Create a concrete global configuration entry, and
 * 3. Successfully erase that configuration by its UUID id using the DELETE
 *    /shoppingMall/platformAdmin/configs/{configId} endpoint.
 *
 * This test validates that the authorization side-effects of the platformAdmin
 * join endpoint are sufficient for calling configuration management APIs, that
 * creation returns a well-formed IShoppingMallConfig object, and that erase
 * completes without error for a valid config id.
 *
 * Step-by-step flow
 *
 * 1. Register a new platform admin account using join(), providing a well-formed
 *    IShoppingMallPlatformAdminJoin.IRequest payload.
 * 2. Validate the returned IShoppingMallPlatformAdmin.IAuthorized object via
 *    typia.assert, and check that the email echo matches the request.
 * 3. As the newly joined admin (token already attached to connection by the SDK),
 *    invoke configs.create() with an IShoppingMallConfig.ICreate body to create
 *    a new config entry (e.g., namespace "checkout", key "max_cart_items",
 *    value "50", active=true, with description).
 * 4. Validate the created IShoppingMallConfig via typia.assert and assert basic
 *    field equality (namespace, key, value, active) between request and
 *    response. Extract the id field as configId.
 * 5. Call configs.erase() with the captured configId and await completion. Since
 *    the response type is void, the absence of an error is the primary success
 *    criterion for the deletion operation.
 * 6. Optionally, verify that the previously returned admin object remains valid by
 *    asserting on its shape again; we do not attempt further network calls
 *    because no GET-by-id endpoint is available.
 */
export async function test_api_platform_admin_config_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "Admin#1234",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Basic sanity check: returned email must match input email
  TestValidator.equals(
    "platform admin email should match join request",
    admin.email,
    joinBody.email,
  );

  // 2. Create a new configuration entry as this admin
  const createBody = {
    namespace: "checkout",
    key: "max_cart_items",
    value: "50",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // Assert basic field consistency between request and response
  TestValidator.equals(
    "config namespace should match creation request",
    createdConfig.namespace,
    createBody.namespace,
  );
  TestValidator.equals(
    "config key should match creation request",
    createdConfig.key,
    createBody.key,
  );
  TestValidator.equals(
    "config value should match creation request",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "config active flag should match creation request",
    createdConfig.active,
    createBody.active,
  );

  // 3. Erase the configuration using its id
  await api.functional.shoppingMall.platformAdmin.configs.erase(connection, {
    configId: createdConfig.id,
  });

  // 4. Re-assert the admin object structure to ensure it remains valid
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
}
