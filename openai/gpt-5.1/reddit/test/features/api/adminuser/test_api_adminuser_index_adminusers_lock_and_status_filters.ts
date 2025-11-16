import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminuser";

/**
 * Validate adminUsers index filtering by logical lock and active state.
 *
 * Business goal: Ensure that the admin user search endpoint `PATCH
 * /communityPlatform/adminUser/adminUsers` correctly respects logical account
 * state filters for active vs inactive and locked vs unlocked accounts, as
 * expressed through `is_active` and `is_locked` fields of
 * `ICommunityPlatformAdminuser.IRequest`.
 *
 * Since the DTO for admin users exposes `is_suspended` and `is_banned` rather
 * than raw `is_active`/`is_locked` booleans, this test interprets those flags
 * as the underlying inputs for the filter logic:
 *
 * - An account that is not suspended and not banned is treated as logically
 *   active and unlocked.
 * - An account that is suspended or banned is treated as logically inactive and
 *   locked.
 *
 * Test flow:
 *
 * 1. Register three administrative accounts via `POST /auth/adminUser/join`:
 *
 *    - Admin A: will act as the authenticated caller for subsequent index
 *         operations.
 *    - Admin B: test subject that will be put into a suspended/banned state.
 *    - Admin C: control account that remains in an active/unlocked state.
 * 2. While authenticated as an adminUser (token is set by the last join call),
 *    create a system configuration row via `POST
 *    /communityPlatform/adminUser/systemConfigs` so that the platform has at
 *    least one configuration entry, mirroring a realistic admin environment.
 * 3. Use the admin update endpoint `PUT
 *    /communityPlatform/adminUser/adminUsers/{username}` to toggle Admin B into
 *    a logically locked/inactive state by setting `is_suspended` to `true`.
 *    Leave Admin C untouched.
 * 4. Call the index endpoint `PATCH /communityPlatform/adminUser/adminUsers` with
 *    a request body that filters for logically active and unlocked accounts:
 *
 *    - First filter scenario: `is_active: true, is_locked: false`. Expect the
 *         summary list to include Admin C and exclude Admin B. Matching is done
 *         by primary-key `id` between `IAuthorized.id` and
 *         `ICommunityPlatformAdminuser.ISummary.id`.
 * 5. Call the index endpoint again with complementary filters to target logically
 *    locked/inactive accounts:
 *
 *    - Second filter scenario: `is_active: false, is_locked: true`. Expect the
 *         summary list to include Admin B and exclude Admin C.
 * 6. For both calls, validate pagination metadata in
 *    `IPageICommunityPlatformAdminuser.ISummary.pagination`:
 *
 *    - `limit` equals the requested limit.
 *    - `current` equals the requested page.
 *    - `records` is at least the number of data items returned.
 *    - `pages` is coherent with `records` and `limit` (simple sanity check).
 * 7. Throughout the test, use `typia.assert` to validate response structures and
 *    `TestValidator` helpers to check key business expectations, especially
 *    that admin IDs for B and C appear or not appear in each filtered result as
 *    appropriate.
 */
export async function test_api_adminuser_index_adminusers_lock_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Create three admin users A, B, C via join
  const joinRequestA = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestA,
    });
  typia.assert(adminA);

  const joinRequestB = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminBAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestB,
    });
  typia.assert(adminBAuthorized);

  const joinRequestC = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminCAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestC,
    });
  typia.assert(adminCAuthorized);

  // 2. Create at least one system configuration row
  const systemConfigCreate =
    typia.random<ICommunityPlatformSystemConfig.ICreate>();
  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigCreate },
    );
  typia.assert(systemConfig);

  // 3. Mark admin B as logically locked/inactive by suspending the account
  const updatedAdminB: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.update(
      connection,
      {
        username: adminBAuthorized.username,
        body: {
          is_suspended: true,
        } satisfies ICommunityPlatformAdminuser.IUpdate,
      },
    );
  typia.assert(updatedAdminB);

  TestValidator.predicate(
    "adminB should be suspended after update",
    () => updatedAdminB.is_suspended === true,
  );

  // 4. Search for active/unlocked accounts: is_active=true, is_locked=false
  const activeUnlockedFilter = {
    is_active: true,
    is_locked: false,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformAdminuser.IRequest;

  const activeUnlockedPage: IPageICommunityPlatformAdminuser.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.index(
      connection,
      { body: activeUnlockedFilter },
    );
  typia.assert(activeUnlockedPage);

  const activeUnlockedIds = activeUnlockedPage.data.map(
    (summary) => summary.id,
  );

  TestValidator.predicate(
    "active/unlocked filter should include adminC by id",
    activeUnlockedIds.includes(adminCAuthorized.id),
  );

  TestValidator.predicate(
    "active/unlocked filter should NOT include adminB by id",
    !activeUnlockedIds.includes(adminBAuthorized.id),
  );

  const paginationActive = activeUnlockedPage.pagination;
  TestValidator.equals(
    "pagination.limit should equal requested limit (active/unlocked)",
    paginationActive.limit,
    activeUnlockedFilter.limit,
  );
  TestValidator.equals(
    "pagination.current should equal requested page (active/unlocked)",
    paginationActive.current,
    activeUnlockedFilter.page,
  );
  TestValidator.predicate(
    "pagination.records >= actual data length (active/unlocked)",
    paginationActive.records >= activeUnlockedPage.data.length,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative (active/unlocked)",
    paginationActive.pages >= 0,
  );

  // 5. Search for logically locked/inactive accounts: is_active=false, is_locked=true
  const inactiveLockedFilter = {
    is_active: false,
    is_locked: true,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformAdminuser.IRequest;

  const inactiveLockedPage: IPageICommunityPlatformAdminuser.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.index(
      connection,
      { body: inactiveLockedFilter },
    );
  typia.assert(inactiveLockedPage);

  const inactiveLockedIds = inactiveLockedPage.data.map(
    (summary) => summary.id,
  );

  TestValidator.predicate(
    "inactive/locked filter should include adminB by id",
    inactiveLockedIds.includes(adminBAuthorized.id),
  );

  TestValidator.predicate(
    "inactive/locked filter should NOT include adminC by id",
    !inactiveLockedIds.includes(adminCAuthorized.id),
  );

  const paginationInactive = inactiveLockedPage.pagination;
  TestValidator.equals(
    "pagination.limit should equal requested limit (inactive/locked)",
    paginationInactive.limit,
    inactiveLockedFilter.limit,
  );
  TestValidator.equals(
    "pagination.current should equal requested page (inactive/locked)",
    paginationInactive.current,
    inactiveLockedFilter.page,
  );
  TestValidator.predicate(
    "pagination.records >= actual data length (inactive/locked)",
    paginationInactive.records >= inactiveLockedPage.data.length,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative (inactive/locked)",
    paginationInactive.pages >= 0,
  );
}
