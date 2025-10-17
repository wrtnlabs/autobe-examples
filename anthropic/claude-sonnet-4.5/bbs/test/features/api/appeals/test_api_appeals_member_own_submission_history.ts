import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";

export async function test_api_appeals_member_own_submission_history(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 3: Administrator creates a category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics Discussion",
          slug: "economics-discussion",
          description: "Discussion about economic topics",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member account and create topic
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 5: Switch to administrator and create moderation action
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const moderationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          administrator_id: administrator.id,
          target_member_id: member.id,
          content_topic_id: topic.id,
          action_type: "hide_content",
          reason:
            "This content violates community guidelines regarding inappropriate language and off-topic discussion.",
          violation_category: "offensive_language",
          content_snapshot: topic.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 6: Switch back to member and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const appealExplanation = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 20,
    sentenceMax: 30,
  });
  const appeal = await api.functional.discussionBoard.member.appeals.create(
    connection,
    {
      body: {
        appealed_moderation_action_id: moderationAction.id,
        appeal_explanation: appealExplanation,
        additional_evidence:
          "I believe this decision was made in error as my content was directly related to the economic discussion topic.",
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 7: Search for own appeals with various filters
  const appealsPage = await api.functional.discussionBoard.member.appeals.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        member_id: member.id,
        status: "pending_review",
        sort_by: "submitted_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(appealsPage);

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    appealsPage.pagination.current === 1 && appealsPage.pagination.limit === 10,
  );

  // Step 9: Validate appeal data is present
  TestValidator.predicate(
    "appeals data array should contain at least one appeal",
    appealsPage.data.length > 0,
  );

  // Step 10: Validate the created appeal is in the results
  const foundAppeal = appealsPage.data.find((a) => a.id === appeal.id);
  typia.assertGuard(foundAppeal!);

  TestValidator.equals(
    "appeal explanation should match",
    foundAppeal.appeal_explanation,
    appealExplanation,
  );

  TestValidator.equals(
    "appeal status should be pending_review",
    foundAppeal.status,
    "pending_review",
  );

  // Step 11: Test filtering by different statuses
  const allAppealsPage =
    await api.functional.discussionBoard.member.appeals.index(connection, {
      body: {
        page: 1,
        limit: 25,
        member_id: member.id,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(allAppealsPage);

  TestValidator.predicate(
    "all appeals should include the created appeal",
    allAppealsPage.data.some((a) => a.id === appeal.id),
  );
}
