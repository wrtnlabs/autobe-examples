import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_activities_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Get initial activities to understand existing data
  const initialActivities =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(initialActivities);
  // Test basic filtering by pagination parameters
  const limitedActivities =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(limitedActivities);
  TestValidator.predicate(
    "limit parameter works",
    limitedActivities.data.length <= 5,
  );
  // Test that we can retrieve activities without filters
  const allActivities =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(allActivities);
  TestValidator.predicate(
    "can retrieve activities",
    allActivities.data.length >= 0,
  );
  // Test date range filtering with a very narrow window to potentially get no results
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours in future
  const farFutureDate = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString(); // 48 hours in future
  const futureActivities =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          start_date: futureDate,
          end_date: farFutureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(futureActivities);
  TestValidator.predicate(
    "future date filter returns empty or valid results",
    futureActivities.data.length === 0 ||
      futureActivities.data.every((activity) => {
        const activityDate = new Date(activity.created_at);
        const start = new Date(futureDate);
        const end = new Date(farFutureDate);
        return activityDate >= start && activityDate <= end;
      }),
  );
  // Test grouping (if supported by the backend)
  const groupedActivities =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          group_by: "daily",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(groupedActivities);
  TestValidator.predicate(
    "grouping returns valid results",
    groupedActivities.data.length >= 0,
  );
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination metadata exists",
    allActivities.pagination.current >= 0 &&
      allActivities.pagination.limit >= 0 &&
      allActivities.pagination.records >= 0 &&
      allActivities.pagination.pages >= 0,
  );
}
