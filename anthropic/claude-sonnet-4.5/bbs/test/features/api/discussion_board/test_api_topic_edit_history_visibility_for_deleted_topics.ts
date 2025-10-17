import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEditHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEditHistory";

export async function test_api_topic_edit_history_visibility_for_deleted_topics(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);
  const adminToken = admin.token.access;

  // Step 2: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  const moderatorToken = moderator.token.access;

  // Step 3: Create regular member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);
  const memberToken = member.token.access;

  // Step 4: Switch to administrator context and create category
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member context and create topic
  connection.headers.Authorization = memberToken;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 6: Edit the topic multiple times to create edit history
  const firstEdit = await api.functional.discussionBoard.member.topics.update(
    connection,
    {
      topicId: topic.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardTopic.IUpdate,
    },
  );
  typia.assert(firstEdit);

  const secondEdit = await api.functional.discussionBoard.member.topics.update(
    connection,
    {
      topicId: topic.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardTopic.IUpdate,
    },
  );
  typia.assert(secondEdit);

  const thirdEdit = await api.functional.discussionBoard.member.topics.update(
    connection,
    {
      topicId: topic.id,
      body: {
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardTopic.IUpdate,
    },
  );
  typia.assert(thirdEdit);

  // Step 7: Delete the topic as member
  await api.functional.discussionBoard.member.topics.erase(connection, {
    topicId: topic.id,
  });

  // Step 8: Attempt to retrieve edit history as regular member - should fail
  await TestValidator.error(
    "member cannot access deleted topic edit history",
    async () => {
      await api.functional.discussionBoard.topics.editHistory(connection, {
        topicId: topic.id,
        body: {} satisfies IDiscussionBoardTopic.IEditHistoryRequest,
      });
    },
  );

  // Step 9: Switch to moderator context and retrieve edit history - should succeed
  connection.headers.Authorization = moderatorToken;

  const moderatorHistory =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {} satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(moderatorHistory);
  TestValidator.predicate(
    "moderator can access deleted topic edit history",
    moderatorHistory.data.length > 0,
  );

  // Step 10: Switch to administrator context and retrieve edit history - should succeed
  connection.headers.Authorization = adminToken;

  const adminHistory = await api.functional.discussionBoard.topics.editHistory(
    connection,
    {
      topicId: topic.id,
      body: {} satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    },
  );
  typia.assert(adminHistory);
  TestValidator.predicate(
    "administrator can access deleted topic edit history",
    adminHistory.data.length > 0,
  );
}
