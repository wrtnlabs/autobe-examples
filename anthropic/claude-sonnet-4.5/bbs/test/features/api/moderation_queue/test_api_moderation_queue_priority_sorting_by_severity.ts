import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test moderation queue retrieval with severity filtering.
 *
 * This test validates that the moderation actions API can retrieve and filter
 * moderation queue items. Since the API returns moderation actions rather than
 * reports directly, we create reports and verify the moderation queue can be
 * queried successfully.
 *
 * Note: The original scenario requested testing report priority sorting by
 * severity, but the available API (moderationActions.index) returns moderation
 * actions which do not expose report severity information. Therefore, this test
 * has been adapted to verify basic moderation queue functionality instead.
 *
 * Test workflow:
 *
 * 1. Create administrator account
 * 2. Create discussion category
 * 3. Create member accounts
 * 4. Create moderator account
 * 5. Create topics and submit reports
 * 6. Verify moderation queue retrieval works
 */
export async function test_api_moderation_queue_priority_sorting_by_severity(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create discussion category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member accounts with stored credentials
  const memberCredentials = await ArrayUtil.asyncRepeat(4, async (index) => {
    const username = RandomGenerator.alphabets(8) + index;
    const email = typia.random<string & tags.Format<"email">>();
    const password = typia.random<
      string & tags.MinLength<8> & tags.MaxLength<128>
    >();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password,
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);

    return { member, username, email, password };
  });

  // Step 4: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: RandomGenerator.alphabets(10) + "_mod",
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Create topics and submit reports
  await ArrayUtil.asyncRepeat(4, async (index) => {
    const cred = memberCredentials[index];

    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 20,
          }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);

    // Submit report with varying violation categories
    const violationCategories = [
      "hate_speech",
      "threats",
      "personal_attack",
      "misinformation",
    ] as const;
    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reported_topic_id: topic.id,
          reported_reply_id: null,
          violation_category: violationCategories[index],
          reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
  });

  // Step 6: Verify moderation queue retrieval
  const queueResult =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(queueResult);

  // Verify queue retrieval succeeded
  TestValidator.predicate(
    "moderation queue should be retrievable",
    typeof queueResult.pagination.current === "number",
  );

  TestValidator.predicate(
    "moderation queue should have valid data array",
    Array.isArray(queueResult.data),
  );
}
