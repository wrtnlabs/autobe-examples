import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_to_post_with_minimal_content(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to obtain a valid JWT token
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the post (using one of the allowed system values)
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a parent post in the created topic
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Economic outlook for Q4",
        content:
          "The current inflation trends indicate a stable upward trajectory in consumer prices.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Reply to the post with exactly 5 characters (minimum allowed content length)
  const replyContent: string = "Hello"; // Exactly 5 characters
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: replyContent,
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // 5. Validate the reply content matches exactly 5 characters
  TestValidator.equals(
    "reply content length should be exactly 5 characters",
    reply.content.length,
    5,
  );
  TestValidator.equals(
    "reply content should match expected text",
    reply.content,
    replyContent,
  );
}
