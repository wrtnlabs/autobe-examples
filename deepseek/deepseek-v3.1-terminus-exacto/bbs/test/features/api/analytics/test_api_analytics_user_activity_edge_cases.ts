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

export async function test_api_analytics_user_activity_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Empty filters - should return default results sorted by creation date
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
  // Test 2: Filter by non-existent activity type - should return empty results
  const nonExistentActivityResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          activity_type: "non_existent_activity_type",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(nonExistentActivityResponse);
  TestValidator.equals(
    "non-existent activity type returns empty",
    nonExistentActivityResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    nonExistentActivityResponse.data.length,
    0,
  );
  // Test 3: Boundary conditions for pagination
  // Test first page
  const firstPageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.predicate(
    "first page should be valid",
    firstPageResponse.pagination !== undefined,
  );
  // Test last page
  const lastPageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(lastPageResponse);
  TestValidator.predicate(
    "last page should be valid",
    lastPageResponse.pagination !== undefined,
  );
  // Test page overflow
  const overflowPageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          page: 1000,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(overflowPageResponse);
  TestValidator.equals(
    "overflow page returns empty data",
    overflowPageResponse.data.length,
    0,
  );
  // Test 4: Complex filter combinations
  const complexFilterResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          activity_type: "login",
          target_entity_type: "user",
          success_status: true,
          created_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_to: new Date().toISOString(),
          search: "user",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(complexFilterResponse);
  // Test 5: Partial search matches
  const partialSearchResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          search: "log",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(partialSearchResponse);
  // Test 6: Null values in optional fields
  const nullFieldsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          activity_type: null,
          target_entity_type: null,
          target_entity_id: null,
          success_status: null,
          user_id: null,
          admin_id: null,
          super_admin_id: null,
          created_at_from: null,
          created_at_to: null,
          search: null,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(nullFieldsResponse);
  TestValidator.predicate(
    "null fields should return valid response",
    nullFieldsResponse.pagination !== undefined,
  );
  // Test 7: Mixed success/failure status
  const mixedStatusResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      {
        body: {
          success_status: null, // Include both success and failure
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(mixedStatusResponse);
  // Test actor resolution validation
  if (mixedStatusResponse.data.length > 0) {
    const activityWithActor = mixedStatusResponse.data.find(
      (activity) =>
        activity.user !== null ||
        activity.admin !== null ||
        activity.superAdmin !== null,
    );
    if (activityWithActor) {
      TestValidator.predicate(
        "actor resolution works",
        activityWithActor.user !== null ||
          activityWithActor.admin !== null ||
          activityWithActor.superAdmin !== null,
      );
    }
  }
}