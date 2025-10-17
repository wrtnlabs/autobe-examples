import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate member to attempt unauthorized reply deletion
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Ensure valid topic exists for post/reply creation
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a post under the topic
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Create a reply to the post
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // 5. Attempt to delete the reply as a member (should fail with 403)
  // This API endpoint is admin-only, so member must receive 403 Forbidden
  await TestValidator.error(
    "member should not be able to delete reply with admin endpoint",
    async () => {
      await api.functional.economicBoard.admin.posts.replies.erase(connection, {
        postId: post.id,
        replyId: reply.id,
      });
    },
  );
}
