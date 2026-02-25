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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_superadmin_analytics_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Test 1: Filter by non-existent activity type
  const response1 =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          activity_type: "non_existent_activity_type",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "empty result for non-existent activity type",
    response1.data.length,
    0,
  );
  // Test 2: Filter by non-existent entity ID
  const response2 =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "empty result for non-existent entity ID",
    response2.data.length,
    0,
  );
  // Test 3: Filter by invalid date range (to before from)
  const response3 =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          created_at_from: new Date("2024-01-02T00:00:00Z").toISOString(),
          created_at_to: new Date("2024-01-01T00:00:00Z").toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "empty result for invalid date range",
    response3.data.length,
    0,
  );
  // Test 4: Filter by non-existent user ID
  const response4 =
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
  typia.assert(response4);
  TestValidator.equals(
    "empty result for non-existent user ID",
    response4.data.length,
    0,
  );
  // Test 5: Filter by non-existent admin ID
  const response5 =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response5);
  TestValidator.equals(
    "empty result for non-existent admin ID",
    response5.data.length,
    0,
  );
  // Test 6: Filter by non-existent super admin ID
  const response6 =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          super_admin_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response6);
  TestValidator.equals(
    "empty result for non-existent super admin ID",
    response6.data.length,
    0,
  );
  // Test 7: Filter by non-matching search term
  const response7 =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          search: "completely_non_existent_search_term_that_will_never_match",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response7);
  TestValidator.equals(
    "empty result for non-matching search term",
    response7.data.length,
    0,
  );
}
