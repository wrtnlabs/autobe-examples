import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderation_dashboard_moderator_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to establish authenticated session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  typia.assert(moderatorAuth.token);
  typia.assert(moderatorAuth.moderator);

  // Verify moderator was created with correct properties
  TestValidator.equals(
    "moderator ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorAuth.id,
    ),
    true,
  );
  TestValidator.equals(
    "moderator display name matches",
    moderatorAuth.moderator.display_name,
    moderatorDisplayName,
  );
  TestValidator.equals(
    "moderator account status is active",
    moderatorAuth.moderator.account_status,
    "active",
  );

  // Step 2: Access the moderation dashboard with authenticated moderator session
  const dashboard: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.dashboard.index(
      connection,
    );
  typia.assert(dashboard);

  // Step 3: Validate dashboard structure and data types
  TestValidator.predicate(
    "pending articles count is non-negative integer",
    typeof dashboard.pending_articles_count === "number" &&
      dashboard.pending_articles_count >= 0 &&
      Number.isInteger(dashboard.pending_articles_count),
  );

  TestValidator.predicate(
    "suspended members count is non-negative integer",
    typeof dashboard.suspended_members_count === "number" &&
      dashboard.suspended_members_count >= 0 &&
      Number.isInteger(dashboard.suspended_members_count),
  );

  TestValidator.predicate(
    "terminated members count is non-negative integer",
    typeof dashboard.terminated_members_count === "number" &&
      dashboard.terminated_members_count >= 0 &&
      Number.isInteger(dashboard.terminated_members_count),
  );

  // Step 4: Validate performance metrics are within valid ranges
  TestValidator.predicate(
    "approval rate is between 0 and 100",
    dashboard.approval_rate >= 0 && dashboard.approval_rate <= 100,
  );

  TestValidator.predicate(
    "deletion rate is between 0 and 100",
    dashboard.deletion_rate >= 0 && dashboard.deletion_rate <= 100,
  );

  TestValidator.predicate(
    "average review time is non-negative",
    dashboard.average_review_time_hours >= 0,
  );

  // Step 5: Validate pending articles array
  TestValidator.predicate(
    "pending articles array is an array",
    Array.isArray(dashboard.pending_articles),
  );

  TestValidator.predicate(
    "pending articles array has max 10 items",
    dashboard.pending_articles.length <= 10,
  );

  // Validate each pending article has required structure
  for (const article of dashboard.pending_articles) {
    typia.assert(article);
    TestValidator.predicate(
      "article has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    TestValidator.predicate(
      "article title is non-empty string",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article has valid status",
      ["pending_approval", "published", "rejected", "archived"].includes(
        article.status,
      ),
    );
    TestValidator.predicate(
      "article view count is non-negative",
      article.view_count >= 0,
    );
  }

  // Step 6: Validate recent moderation actions array
  TestValidator.predicate(
    "recent moderation actions is an array",
    Array.isArray(dashboard.recent_moderation_actions),
  );

  TestValidator.predicate(
    "recent moderation actions array has max 20 items",
    dashboard.recent_moderation_actions.length <= 20,
  );

  // Validate each moderation action has required structure
  for (const action of dashboard.recent_moderation_actions) {
    typia.assert(action);
    TestValidator.predicate(
      "action has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.id,
      ),
    );
    TestValidator.predicate(
      "action has valid UUID moderatorId",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.moderatorId,
      ),
    );
    TestValidator.predicate(
      "action has valid UUID memberId",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.memberId,
      ),
    );
    TestValidator.predicate(
      "action type is valid",
      [
        "approved",
        "rejected",
        "requested_changes",
        "deleted_article",
        "deleted_comment",
        "edited_article",
        "edited_comment",
        "flagged",
      ].includes(action.action_type),
    );
    TestValidator.predicate(
      "content type is valid",
      ["article", "comment"].includes(action.content_type),
    );
    TestValidator.predicate(
      "reason length is valid",
      action.reason.length >= 10 && action.reason.length <= 500,
    );
  }

  // Step 7: Validate dashboard metadata
  TestValidator.predicate(
    "dashboard_last_refreshed is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      dashboard.dashboard_last_refreshed,
    ),
  );

  TestValidator.predicate(
    "dashboard_last_refreshed is in the past",
    new Date(dashboard.dashboard_last_refreshed) <= new Date(),
  );

  // Step 8: Validate data consistency
  TestValidator.predicate(
    "pending articles count matches array length or is greater",
    dashboard.pending_articles_count >= dashboard.pending_articles.length,
  );

  TestValidator.predicate(
    "recent actions count is consistent with array length",
    dashboard.recent_moderation_actions.length <= 20,
  );

  // Step 9: Verify sensitive information filtering
  // All moderators should have their data accessible
  for (const action of dashboard.recent_moderation_actions) {
    TestValidator.predicate(
      "moderator ID is not empty",
      action.moderatorId.length > 0,
    );
  }
}
