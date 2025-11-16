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
 * Validate that system configuration search respects the isActive filter.
 *
 * Business flow:
 *
 * 1. Register an adminUser account via POST /auth/adminUser/join to obtain an
 *    authenticated admin context.
 * 2. Create two system configuration entries via POST
 *    /communityPlatform/adminUser/systemConfigs:
 *
 *    - One active configuration (is_active = true).
 *    - One inactive configuration (is_active = false). Each must have a distinct
 *         config_key so they can be individually identified.
 * 3. Call PATCH /communityPlatform/adminUser/systemConfigs with a search body
 *    where isActive = true, page = 1, and limit large enough to include both
 *    created configs if active. Verify:
 *
 *    - Every returned row has is_active === true.
 *    - The explicitly created inactive configuration does not appear.
 * 4. Call the same endpoint again with isActive = false and verify:
 *
 *    - Every returned row has is_active === false.
 *    - The explicitly created active configuration does not appear.
 */
export async function test_api_system_configs_search_filter_by_active_flag(
  connection: api.IConnection,
) {
  // 1. Register adminUser and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#1234",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Create one active and one inactive system configuration
  const activeKey = `e2e_active_${RandomGenerator.alphaNumeric(8)}`;
  const inactiveKey = `e2e_inactive_${RandomGenerator.alphaNumeric(8)}`;

  const activeCreateBody = {
    category: "e2e_test",
    config_key: activeKey,
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: "Active config for isActive filter test",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const inactiveCreateBody = {
    category: "e2e_test",
    config_key: inactiveKey,
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: "Inactive config for isActive filter test",
    is_active: false,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const activeConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: activeCreateBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(activeConfig);

  const inactiveConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: inactiveCreateBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(inactiveConfig);

  // 3. Search with isActive = true
  const searchActiveBody = {
    page: 1,
    limit: 50,
    isActive: true,
    category: "e2e_test",
  } satisfies ICommunityPlatformSystemConfig.IRequest;

  const activePage =
    await api.functional.communityPlatform.adminUser.systemConfigs.index(
      connection,
      { body: searchActiveBody },
    );
  typia.assert<IPageICommunityPlatformSystemConfig.ISummary>(activePage);

  // All results must be active
  TestValidator.predicate(
    "all configs in isActive=true search are active",
    activePage.data.every((row) => row.is_active === true),
  );

  // The explicitly inactive config must not appear
  const foundInactiveInActive = activePage.data.some(
    (row) => row.id === inactiveConfig.id,
  );
  TestValidator.predicate(
    "inactive config not returned when filtering by isActive=true",
    foundInactiveInActive === false,
  );

  // The explicitly active config should appear
  const foundActiveInActive = activePage.data.some(
    (row) => row.id === activeConfig.id,
  );
  TestValidator.predicate(
    "active config appears in isActive=true results",
    foundActiveInActive === true,
  );

  // 4. Search with isActive = false
  const searchInactiveBody = {
    page: 1,
    limit: 50,
    isActive: false,
    category: "e2e_test",
  } satisfies ICommunityPlatformSystemConfig.IRequest;

  const inactivePage =
    await api.functional.communityPlatform.adminUser.systemConfigs.index(
      connection,
      { body: searchInactiveBody },
    );
  typia.assert<IPageICommunityPlatformSystemConfig.ISummary>(inactivePage);

  // All results must be inactive
  TestValidator.predicate(
    "all configs in isActive=false search are inactive",
    inactivePage.data.every((row) => row.is_active === false),
  );

  // The explicitly active config must not appear
  const foundActiveInInactive = inactivePage.data.some(
    (row) => row.id === activeConfig.id,
  );
  TestValidator.predicate(
    "active config not returned when filtering by isActive=false",
    foundActiveInInactive === false,
  );

  // The explicitly inactive config should appear
  const foundInactiveInInactive = inactivePage.data.some(
    (row) => row.id === inactiveConfig.id,
  );
  TestValidator.predicate(
    "inactive config appears in isActive=false results",
    foundInactiveInInactive === true,
  );
}
