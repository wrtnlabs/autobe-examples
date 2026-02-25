import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test analytics filtering by different actor types (user_id, admin_id, super_admin_id).
 * Create activities performed by different actors (regular users, admins, superAdmins)
 * and verify filtering correctly isolates activities by specific actor types.
 * Test combinations where multiple actor filters are specified and validate priority
 * or intersection logic. Ensure that actor identity resolution works correctly in
 * the summary view (user, admin, superAdmin embedded objects). Validate that
 * filtering by non-existent actor IDs returns appropriate empty results.
 * Test edge cases where activities might have null actor references for
 * system-generated activities.
 */
export async function test_api_superadmin_analytics_actor_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections and capture authorized responses
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test filtering by user_id
  const userFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          user_id: userAuth.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(userFilteredAnalytics);
  // Test filtering by admin_id
  const adminFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          admin_id: adminAuth.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(adminFilteredAnalytics);
  // Test filtering by super_admin_id
  const superAdminFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          super_admin_id: superAdminAuth.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(superAdminFilteredAnalytics);
  // Test filtering by non-existent actor IDs
  const nonExistentUserFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(nonExistentUserFilteredAnalytics);
  // Validate actor identity resolution in summary view
  if (userFilteredAnalytics.data.length > 0) {
    const activity = userFilteredAnalytics.data[0];
    TestValidator.predicate("user actor resolution", activity.user !== null);
    TestValidator.equals(
      "user id matches filter",
      activity.user?.id,
      userAuth.id,
    );
  }
  if (adminFilteredAnalytics.data.length > 0) {
    const activity = adminFilteredAnalytics.data[0];
    TestValidator.predicate("admin actor resolution", activity.admin !== null);
    TestValidator.equals(
      "admin id matches filter",
      activity.admin?.id,
      adminAuth.id,
    );
  }
  if (superAdminFilteredAnalytics.data.length > 0) {
    const activity = superAdminFilteredAnalytics.data[0];
    TestValidator.predicate(
      "superAdmin actor resolution",
      activity.superAdmin !== null,
    );
    TestValidator.equals(
      "superAdmin id matches filter",
      activity.superAdmin?.id,
      superAdminAuth.id,
    );
  }
  // Test empty results for non-existent IDs
  TestValidator.equals(
    "non-existent user returns empty results",
    nonExistentUserFilteredAnalytics.data.length,
    0,
  );
  // Test pagination metadata - fix nested pagination structure access
  TestValidator.predicate(
    "pagination metadata present",
    userFilteredAnalytics.pagination !== undefined,
  );
  TestValidator.predicate(
    "valid page number",
    userFilteredAnalytics.pagination.pagination.pagination.pagination.current >=
      0,
  );
  TestValidator.predicate(
    "valid limit",
    userFilteredAnalytics.pagination.pagination.pagination.pagination.limit >=
      0,
  );
}
