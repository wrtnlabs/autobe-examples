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
 * Validate is_active based filtering for namespace-based configuration search.
 *
 * Business context: Admins can manage global configuration entries stored in
 * shopping_mall_configs. The /shoppingMall/admin/configs/byNamespace endpoint
 * allows searching these configs with filters including namespace and
 * is_active. We must ensure that when is_active is explicitly set to true or
 * false, only matching records are returned, and when it is omitted, both
 * active and inactive configs are discoverable for the given namespace.
 *
 * Steps:
 *
 * 1. Join an admin account via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. The SDK will automatically attach the
 *    Authorization header with the issued access token.
 * 2. Create two configuration entries via POST /shoppingMall/admin/configs
 *    (api.functional.shoppingMall.admin.configs.create):
 *
 *    - ConfigActive: namespace=N, config_key=K, environment=E, is_active=true
 *    - ConfigInactive: same namespace/config_key/environment, is_active=false Other
 *         fields like description and value_json can be arbitrary but valid
 *         JSON strings.
 * 3. Search by namespace with is_active=true via
 *    api.functional.shoppingMall.admin.configs.byNamespace.index, passing an
 *    IShoppingMallConfig.IRequest body that at least sets namespace=N,
 *    is_active=true, and some reasonable page/limit values.
 *
 *    - Assert with typia.assert that the response satisfies
 *         IPageIShoppingMallConfig.ISummary.
 *    - Use TestValidator to assert that:
 *
 *         - At least one record is returned.
 *         - The active config ID is present in data[].id.
 *         - The inactive config ID is not present in data[].id.
 * 4. Search by namespace with is_active=false and assert the inverse:
 *
 *    - Only the inactive config ID is present and the active one is not.
 * 5. Search by namespace with is_active omitted and ensure both configs are
 *    discoverable:
 *
 *    - Assert the response type with typia.assert.
 *    - Assert that data[].id contains both the active and inactive IDs (taking into
 *         account pagination by using a sufficiently high limit, e.g., 10).
 */
export async function test_api_admin_configs_search_by_namespace_inactive_entries_filtering(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!" as string & tags.Format<"password">,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create two configuration entries with same namespace/key/env but different is_active
  const namespace = `checkout_${RandomGenerator.alphaNumeric(8)}`;
  const configKey = `maxCartItems_${RandomGenerator.alphaNumeric(4)}`;
  const environment = "staging";

  const activeCreateBody = {
    namespace,
    config_key: configKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ maxCartItems: 50 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const activeConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: activeCreateBody,
    });
  typia.assert(activeConfig);

  const inactiveCreateBody = {
    namespace,
    config_key: configKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ maxCartItems: 10 }),
    is_active: false,
  } satisfies IShoppingMallConfig.ICreate;

  const inactiveConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: inactiveCreateBody,
    });
  typia.assert(inactiveConfig);

  // Helper to check presence of IDs in summary pages
  const containsId = (
    page: IPageIShoppingMallConfig.ISummary,
    id: string & tags.Format<"uuid">,
  ): boolean => page.data.some((cfg) => cfg.id === id);

  // 3. Search with is_active=true
  const requestActiveOnly = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    namespace,
    is_active: true,
  } satisfies IShoppingMallConfig.IRequest;

  const pageActiveOnly: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      {
        body: requestActiveOnly,
      },
    );
  typia.assert(pageActiveOnly);

  TestValidator.predicate(
    "is_active=true search returns at least one config",
    pageActiveOnly.data.length > 0,
  );

  TestValidator.predicate(
    "active config is included when filtering by is_active=true",
    containsId(pageActiveOnly, activeConfig.id),
  );

  TestValidator.predicate(
    "inactive config is excluded when filtering by is_active=true",
    !containsId(pageActiveOnly, inactiveConfig.id),
  );

  // 4. Search with is_active=false
  const requestInactiveOnly = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    namespace,
    is_active: false,
  } satisfies IShoppingMallConfig.IRequest;

  const pageInactiveOnly: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      {
        body: requestInactiveOnly,
      },
    );
  typia.assert(pageInactiveOnly);

  TestValidator.predicate(
    "is_active=false search returns at least one config",
    pageInactiveOnly.data.length > 0,
  );

  TestValidator.predicate(
    "inactive config is included when filtering by is_active=false",
    containsId(pageInactiveOnly, inactiveConfig.id),
  );

  TestValidator.predicate(
    "active config is excluded when filtering by is_active=false",
    !containsId(pageInactiveOnly, activeConfig.id),
  );

  // 5. Search with is_active omitted – expect both entries discoverable
  const requestAllByNamespace = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    namespace,
  } satisfies IShoppingMallConfig.IRequest;

  const pageAllByNamespace: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      {
        body: requestAllByNamespace,
      },
    );
  typia.assert(pageAllByNamespace);

  TestValidator.predicate(
    "search without is_active returns at least two configs for the namespace",
    pageAllByNamespace.data.length >= 2,
  );

  TestValidator.predicate(
    "search without is_active includes active config",
    containsId(pageAllByNamespace, activeConfig.id),
  );

  TestValidator.predicate(
    "search without is_active includes inactive config",
    containsId(pageAllByNamespace, inactiveConfig.id),
  );
}
