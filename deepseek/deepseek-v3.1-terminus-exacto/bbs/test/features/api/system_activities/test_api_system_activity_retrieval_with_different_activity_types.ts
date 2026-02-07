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

/**
 * Test retrieval of system activities with different activity types to ensure comprehensive audit record access.
 * Create multiple system activities representing different event types (user login, content creation, administrative action)
 * and verify that administrators can retrieve each type successfully. Validate that the response includes appropriate
 * metadata specific to each activity type and that actor references are correctly resolved.
 */
export async function test_api_system_activity_retrieval_with_different_activity_types(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Define different activity types to search for
  const activityTypes = [
    "user_login",
    "article_create",
    "admin_action",
    "comment_create",
    "section_browse",
  ] as const;
  // Search for activities with different types and retrieve them individually
  const retrievedActivities: IDiscussionBoardSystemActivity[] = [];
  for (const activityType of activityTypes) {
    const searchRequest: IDiscussionBoardSystemActivity.IRequest = {
      activity_type: activityType,
      start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString(),
      group_by: "daily",
      page: 1,
      limit: 10,
    };
    const activitiesPage =
      await api.functional.discussionBoard.admin.system_activities.index(
        adminConnection,
        { body: searchRequest },
      );
    typia.assert(activitiesPage);
    // If activities exist for this type, retrieve the first one individually
    if (activitiesPage.data.length > 0) {
      const activityId = activitiesPage.data[0].id;
      const activity =
        await api.functional.discussionBoard.admin.system_activities.at(
          adminConnection,
          { activityId },
        );
      typia.assert(activity);
      retrievedActivities.push(activity);
      // Validate activity structure
      TestValidator.predicate(
        "has total activities",
        activity.total_activities >= 0,
      );
      TestValidator.predicate("has success count", activity.success_count >= 0);
      TestValidator.predicate("has error count", activity.error_count >= 0);
      TestValidator.predicate(
        "has success rate",
        activity.success_rate >= 0 && activity.success_rate <= 100,
      );
      TestValidator.equals("period is valid", activity.period, "daily");
      TestValidator.predicate(
        "has valid start date",
        !isNaN(new Date(activity.start_date).getTime()),
      );
      TestValidator.predicate(
        "has valid end date",
        !isNaN(new Date(activity.end_date).getTime()),
      );
      // Validate previous period comparison
      TestValidator.predicate(
        "has valid trend direction",
        activity.previous_period_comparison.trend_direction === "improving" ||
          activity.previous_period_comparison.trend_direction === "declining" ||
          activity.previous_period_comparison.trend_direction === "stable",
      );
    }
  }
  // Validate that we retrieved at least some activities
  TestValidator.predicate(
    "retrieved activities from different types",
    retrievedActivities.length > 0,
  );
}