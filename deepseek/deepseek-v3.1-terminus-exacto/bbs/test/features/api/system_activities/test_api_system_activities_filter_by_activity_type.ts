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

export async function test_api_system_activities_filter_by_activity_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Test 1: Filter by specific activity type (e.g., "login")
  const loginActivities =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: "login",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(loginActivities);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination object",
    () => typeof loginActivities.pagination === "object",
  );
  TestValidator.predicate(
    "has valid current page",
    () => (loginActivities.pagination as any).current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    () => (loginActivities.pagination as any).limit > 0,
  );
  TestValidator.predicate(
    "has records count",
    () => (loginActivities.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    () => (loginActivities.pagination as any).pages >= 0,
  );
  // Validate activity type filter
  if (loginActivities.data.length > 0) {
    for (const activity of loginActivities.data) {
      TestValidator.equals(
        "activity type filter matches",
        activity.activity_type,
        "login",
      );
      // Validate actor information resolution (business logic validation after typia.assert)
      if (activity.user) {
        TestValidator.predicate(
          "only user actor present when user exists",
          () =>
            activity.user !== null &&
            activity.admin === null &&
            activity.superAdmin === null,
        );
      } else if (activity.admin) {
        TestValidator.predicate(
          "only admin actor present when admin exists",
          () =>
            activity.admin !== null &&
            activity.user === null &&
            activity.superAdmin === null,
        );
      } else if (activity.superAdmin) {
        TestValidator.predicate(
          "only super admin actor present when super admin exists",
          () =>
            activity.superAdmin !== null &&
            activity.user === null &&
            activity.admin === null,
        );
      }
    }
  }
  // Test 2: Filter by non-existing activity type
  const nonExistingActivities =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: "non_existing_activity_type",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(nonExistingActivities);
  // Verify no results for non-existing activity type
  TestValidator.equals(
    "non-existing type returns empty array",
    nonExistingActivities.data.length,
    0,
  );
  TestValidator.equals(
    "non-existing type shows zero records",
    (nonExistingActivities.pagination as any).records,
    0,
  );
  // Test 3: Filter by another activity type (e.g., "article_create")
  const articleCreateActivities =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: "article_create",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(articleCreateActivities);
  // Validate filtering consistency
  if (articleCreateActivities.data.length > 0) {
    for (const activity of articleCreateActivities.data) {
      TestValidator.equals(
        "article_create type filter matches",
        activity.activity_type,
        "article_create",
      );
    }
  }
  // Test 4: Filter with multiple parameters including activity type
  const multiFilterActivities =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: "comment_create",
          success_status: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(multiFilterActivities);
  if (multiFilterActivities.data.length > 0) {
    for (const activity of multiFilterActivities.data) {
      TestValidator.equals(
        "multi-filter activity type matches",
        activity.activity_type,
        "comment_create",
      );
      TestValidator.equals(
        "multi-filter success status matches",
        activity.success_status,
        true,
      );
    }
  }
}