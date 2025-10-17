import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_update_by_non_author(
  connection: api.IConnection,
) {
  // 1. Authenticate first member and create topic
  const firstMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Create a topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 2. Create a post
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Test Post Subject",
        content: "This is a test post content.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 3. First member creates a reply
  const firstReply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: "This is the first member's reply.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(firstReply);

  // 4. Authenticate second member
  const secondMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondMember: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password_hash: "hashed_password_456",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // 5. Second member attempts to update first member's reply
  // This should fail with 403 Forbidden
  await TestValidator.error("non-author cannot update reply", async () => {
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: firstReply.id,
      body: {
        content: "This is a malicious update attempt.",
      } satisfies IEconomicBoardReply.IUpdate,
    });
  });
}
