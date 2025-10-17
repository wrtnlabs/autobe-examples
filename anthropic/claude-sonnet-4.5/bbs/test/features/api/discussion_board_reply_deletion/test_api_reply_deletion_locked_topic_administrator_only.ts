import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_reply_deletion_locked_topic_administrator_only(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, ""),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12) + "Aa1!",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create moderator account
  const moderatorData = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, ""),
    email: `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12) + "Aa1!",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, ""),
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12) + "Aa1!",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Administrator creates a category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 5: Member creates a topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 6: Member creates a reply on the topic
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 7: Attempt to delete reply as member (should fail with 423 Locked)
  await TestValidator.httpError(
    "member cannot delete reply on locked topic",
    423,
    async () => {
      await api.functional.discussionBoard.member.topics.replies.erase(
        connection,
        {
          topicId: topic.id,
          replyId: reply.id,
        },
      );
    },
  );

  // Step 8: Switch to moderator context and attempt deletion (should fail with 423 Locked)
  const moderatorConnection = {
    ...connection,
    headers: {},
  } satisfies api.IConnection;
  await api.functional.auth.moderator.join(moderatorConnection, {
    body: moderatorData,
  });

  await TestValidator.httpError(
    "moderator cannot delete reply on locked topic",
    423,
    async () => {
      await api.functional.discussionBoard.member.topics.replies.erase(
        moderatorConnection,
        {
          topicId: topic.id,
          replyId: reply.id,
        },
      );
    },
  );

  // Step 9: Switch to administrator context and successfully delete the reply
  const adminConnection = {
    ...connection,
    headers: {},
  } satisfies api.IConnection;
  await api.functional.auth.administrator.join(adminConnection, {
    body: adminData,
  });

  await api.functional.discussionBoard.member.topics.replies.erase(
    adminConnection,
    {
      topicId: topic.id,
      replyId: reply.id,
    },
  );
}
