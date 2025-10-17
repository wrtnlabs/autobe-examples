import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_edit_own_reply_within_24_hours(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: typia.random<string>(), // Generate random string valid for mock backend
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
        description: "Discussion about inflation rates and economic impact",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post under the created topic
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Impact of inflation on household budgets",
        content:
          "Inflation is rising rapidly and hitting household budgets hard. Consumers are cutting back on non-essential spending and seeking alternatives to maintain their standard of living.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a reply to the post
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content:
          "I agree that inflation is devastating for middle-class families. My grocery bill has increased by 40% in the past year alone.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // Step 5: Verify that editing the reply (within the 24-hour window) succeeds
  const updatedReply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: {
        content:
          "I agree that inflation is devastating for middle-class families. My grocery bill has increased by 45% in the past year alone.",
      } satisfies IEconomicBoardReply.IUpdate,
    });
  typia.assert(updatedReply);

  // Step 6: Confirm the reply was edited by checking the 'edited' flag
  TestValidator.equals("edited flag should be true", updatedReply.edited, true);

  // Step 7: Test the 5-1000 character constraint for reply updates

  // Test: Edit with content too short (less than 5 characters)
  await TestValidator.error("reply content too short should fail", async () => {
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: {
        content: "Hi", // 2 characters — too short
      } satisfies IEconomicBoardReply.IUpdate,
    });
  });

  // Test: Edit with valid content (exactly 5 characters)
  const validContent: IEconomicBoardReply.IUpdate = {
    content: "Hello", // 5 characters — minimal valid
  };
  const updatedReply5Chars: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: validContent,
    });
  typia.assert(updatedReply5Chars);

  // Test: Edit with content too long (1001 characters)
  const contentTooLong: string = "A".repeat(1001); // Exactly 1001 characters
  await TestValidator.error("reply content too long should fail", async () => {
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: {
        content: contentTooLong,
      } satisfies IEconomicBoardReply.IUpdate,
    });
  });

  // Step 8: Test successful edit with content that is within limits (1000 characters)
  const contentJustRight: string = "A".repeat(1000); // Exactly 1000 characters
  const updatedReply1000Chars: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: {
        content: contentJustRight,
      } satisfies IEconomicBoardReply.IUpdate,
    });
  typia.assert(updatedReply1000Chars);
  TestValidator.equals(
    "edited flag should still be true",
    updatedReply1000Chars.edited,
    true,
  );
}
