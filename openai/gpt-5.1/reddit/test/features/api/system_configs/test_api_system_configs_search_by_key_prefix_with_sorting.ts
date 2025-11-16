import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";

/**
 * Validate searching system configuration entries by key prefix with ordering.
 *
 * Business goal: Ensure that an authenticated adminUser can search community
 * platform system configuration records using the `keyPrefix` filter and that
 * the results are correctly ordered by `config_key` according to the
 * `orderDirection` option. This test also verifies that unrelated configuration
 * keys (different prefixes) are excluded from the result set.
 *
 * Steps:
 *
 * 1. Join as a fresh adminUser so that the shared connection has a valid
 *    Authorization header for admin-only system config APIs.
 * 2. Create multiple system configuration entries using
 *    /communityPlatform/adminUser/systemConfigs (create), including:
 *
 *    - Several entries whose `config_key` starts with `"auth_"`, mixed across
 *         `category = "auth"` and `category = null`.
 *    - Additional entries whose `config_key` starts with `"ui_"` to act as
 *         non-matching noise data.
 * 3. Call the search endpoint /communityPlatform/adminUser/systemConfigs (index)
 *    with a body satisfying ICommunityPlatformSystemConfig.IRequest:
 *
 *    - KeyPrefix: "auth_"
 *    - OrderBy: "config_key"
 *    - OrderDirection: "asc"
 *    - Page: 1
 *    - Limit: enough to include all created `auth_` entries
 * 4. Assert that:
 *
 *    - All returned entries have config_key starting with "auth_".
 *    - None of the created `ui_` config_keys appear in the results.
 *    - The `config_key` sequence is lexicographically ascending.
 * 5. Repeat the search with orderDirection: "desc" and verify:
 *
 *    - The same filtered set of `auth_` config_keys is returned.
 *    - The order of `config_key` values is the exact reverse of the ascending order.
 * 6. Perform basic pagination sanity checks on the response.
 */
export async function test_api_system_configs_search_by_key_prefix_with_sorting(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create multiple system configuration entries with different prefixes.
  const authKeys = [
    "auth_max_login_attempts",
    "auth_lockout_window",
    "auth_password_policy",
    "auth_session_timeout",
  ] as const;
  const uiKeys = ["ui_theme_default", "ui_items_per_page"] as const;

  // Helper to build a config create body.
  const buildConfigBody = (category: string | null, configKey: string) =>
    ({
      category,
      config_key: configKey,
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      is_active: true,
    }) satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdAuthConfigs: ICommunityPlatformSystemConfig[] = [];

  // Create auth_ configs with mixed categories.
  for (let i = 0; i < authKeys.length; i++) {
    const category = i % 2 === 0 ? "auth" : null;
    const body = buildConfigBody(category, authKeys[i]);
    const created =
      await api.functional.communityPlatform.adminUser.systemConfigs.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdAuthConfigs.push(created);
  }

  // Create ui_ configs as noise.
  for (let i = 0; i < uiKeys.length; i++) {
    const body = buildConfigBody("ui", uiKeys[i]);
    const created =
      await api.functional.communityPlatform.adminUser.systemConfigs.create(
        connection,
        { body },
      );
    typia.assert(created);
  }

  // 3. Search with keyPrefix = "auth_" in ascending order by config_key.
  const ascRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    orderBy: "config_key" as const,
    orderDirection: "asc" as const,
    keyPrefix: "auth_",
  } satisfies ICommunityPlatformSystemConfig.IRequest;

  const ascPage: IPageICommunityPlatformSystemConfig.ISummary =
    await api.functional.communityPlatform.adminUser.systemConfigs.index(
      connection,
      { body: ascRequestBody },
    );
  typia.assert(ascPage);

  // 4. Validate ascending search result semantics.
  const ascKeys = ascPage.data.map((row) => row.config_key);

  // All returned keys must start with auth_.
  TestValidator.predicate(
    "all ascending results have auth_ prefix",
    ascKeys.every((k) => k.startsWith("auth_")),
  );

  // None of the ui_ keys should appear.
  TestValidator.predicate(
    "no ui_ prefixed keys appear in ascending results",
    uiKeys.every((uiKey) => !ascKeys.includes(uiKey)),
  );

  // Local expected auth_ keys (based on created configs) sorted ascending.
  const expectedAuthKeysAsc = [...createdAuthConfigs]
    .map((cfg) => cfg.config_key)
    .filter((k) => k.startsWith("auth_"))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  TestValidator.equals(
    "ascending config_key order matches expectation",
    ascKeys,
    expectedAuthKeysAsc,
  );

  // 5. Search again with descending order.
  const descRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    orderBy: "config_key" as const,
    orderDirection: "desc" as const,
    keyPrefix: "auth_",
  } satisfies ICommunityPlatformSystemConfig.IRequest;

  const descPage: IPageICommunityPlatformSystemConfig.ISummary =
    await api.functional.communityPlatform.adminUser.systemConfigs.index(
      connection,
      { body: descRequestBody },
    );
  typia.assert(descPage);

  const descKeys = descPage.data.map((row) => row.config_key);

  // All returned keys must start with auth_.
  TestValidator.predicate(
    "all descending results have auth_ prefix",
    descKeys.every((k) => k.startsWith("auth_")),
  );

  // None of the ui_ keys should appear.
  TestValidator.predicate(
    "no ui_ prefixed keys appear in descending results",
    uiKeys.every((uiKey) => !descKeys.includes(uiKey)),
  );

  // Expected keys in descending order.
  const expectedAuthKeysDesc = [...expectedAuthKeysAsc].reverse();

  TestValidator.equals(
    "descending config_key order matches expectation",
    descKeys,
    expectedAuthKeysDesc,
  );

  // The set of keys (ignoring order) must match between asc and desc.
  const ascKeySetSorted = [...ascKeys].sort();
  const descKeySetSorted = [...descKeys].sort();
  TestValidator.equals(
    "ascending and descending result sets have identical keys",
    ascKeySetSorted,
    descKeySetSorted,
  );

  // 7. Basic pagination sanity checks for ascending page.
  TestValidator.predicate(
    "pagination current page is 1",
    ascPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at least number of returned records",
    ascPage.pagination.limit >= ascPage.data.length,
  );
  TestValidator.predicate(
    "pagination records is >= data length",
    ascPage.pagination.records >= ascPage.data.length,
  );
}
