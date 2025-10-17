import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_update_by_author_within_window(
  connection: api.IConnection,
) {
  // 1. Authenticate member to authorize reply update within window
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Ensure valid topic exists to enable post and reply creation
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post to act as target for reply
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post is published", post.status, "published");

  // 4. Create a reply to update within 24-hour window
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // 5. Update the reply with new content within the 24-hour window
  const updatedContent: string = RandomGenerator.paragraph({ sentences: 3 });
  const updatedReply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: {
        content: updatedContent,
      } satisfies IEconomicBoardReply.IUpdate,
    });
  typia.assert(updatedReply);

  // 6. Validate that the update was successful
  TestValidator.equals(
    "reply content was updated",
    updatedReply.content,
    updatedContent,
  );
  TestValidator.predicate(
    "reply is marked as edited",
    updatedReply.edited === true,
  );
  TestValidator.predicate(
    "updated_at changed from created_at",
    updatedReply.updated_at > reply.created_at,
  );
  TestValidator.equals(
    "created_at remained unchanged",
    updatedReply.created_at,
    reply.created_at,
  );
}
