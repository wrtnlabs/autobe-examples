import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate admin configuration search by namespace when a single active entry
 * exists.
 *
 * Business context: Administrative users manage global shopping-mall platform
 * behavior via config entries stored in `shopping_mall_configs`. This test
 * ensures that after an admin creates an active configuration for a given
 * namespace, the `/shoppingMall/admin/configs/byNamespace` search endpoint can
 * retrieve that configuration using namespace-based filtering and pagination.
 *
 * Steps:
 *
 * 1. Admin joins the platform via POST /auth/admin/join to obtain an authenticated
 *    admin context and tokens handled by the SDK.
 * 2. Admin creates one active configuration entry for a unique namespace using
 *    POST /shoppingMall/admin/configs with an `IShoppingMallConfig.ICreate`
 *    body.
 * 3. (Isolation) Admin may create another configuration under a different
 *    namespace to verify that byNamespace search excludes it.
 * 4. Admin calls PATCH /shoppingMall/admin/configs/byNamespace with an
 *    `IShoppingMallConfig.IRequest` body specifying the target namespace and
 *    basic pagination inputs (page=0, limit=20).
 * 5. Validate that the paginated result contains the created configuration in its
 *    `data` array, that core fields match, and that all returned entries belong
 *    to the requested namespace.
 */
export async function test_api_admin_configs_search_by_namespace_with_single_active_entry(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an active configuration entry for a specific namespace
  const namespaceBase = "checkout";
  const namespaceSuffix = RandomGenerator.alphaNumeric(8);
  const targetNamespace = `${namespaceBase}-${namespaceSuffix}`;

  const targetConfigKey = "maxCartItems";
  const targetEnvironment = "production";
  const targetDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const valueObject = { max: 50 };
  const valueJson = JSON.stringify(valueObject);

  const createBody = {
    namespace: targetNamespace,
    config_key: targetConfigKey,
    environment: targetEnvironment,
    description: targetDescription,
    value_json: valueJson,
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Create another configuration under a different namespace to ensure it is excluded
  const otherNamespace = `pricing-${RandomGenerator.alphaNumeric(8)}`;
  const otherCreateBody = {
    namespace: otherNamespace,
    config_key: "maxDiscountRate",
    environment: targetEnvironment,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    value_json: JSON.stringify({ max: 0.3 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const otherConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: otherCreateBody,
    });
  typia.assert(otherConfig);

  // 4. Search configurations by the target namespace using byNamespace.index
  const searchBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    namespace: targetNamespace,
  } satisfies IShoppingMallConfig.IRequest;

  const pageResult: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 5. Assertions on pagination and data contents
  TestValidator.predicate(
    "pagination should report at least one record",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "data array should contain at least one configuration",
    data.length >= 1,
  );

  // Ensure all returned configs belong to the requested namespace
  TestValidator.predicate(
    "all configs in data should match the requested namespace",
    data.every((cfg) => cfg.namespace === targetNamespace),
  );

  // Find the config matching the created one by id
  const matched = data.find((cfg) => cfg.id === createdConfig.id);

  TestValidator.predicate(
    "created configuration should appear in namespace search results",
    matched !== undefined,
  );

  if (matched !== undefined) {
    // Verify key fields match between the created config and the summary
    TestValidator.equals(
      "matched namespace should equal created namespace",
      matched.namespace,
      createdConfig.namespace,
    );

    TestValidator.equals(
      "matched config_key should equal created config_key",
      matched.config_key,
      createdConfig.config_key,
    );

    TestValidator.equals(
      "matched environment should equal created environment",
      matched.environment,
      createdConfig.environment,
    );

    TestValidator.equals(
      "matched is_active should be true and equal created is_active",
      matched.is_active,
      createdConfig.is_active,
    );

    TestValidator.predicate(
      "matched description should be defined (not null/undefined)",
      matched.description !== null && matched.description !== undefined,
    );

    TestValidator.equals(
      "matched description should equal created description",
      matched.description,
      createdConfig.description,
    );

    TestValidator.predicate(
      "matched created_at should be a non-empty string",
      matched.created_at.length > 0,
    );

    TestValidator.predicate(
      "matched updated_at should be a non-empty string",
      matched.updated_at.length > 0,
    );
  }
}
