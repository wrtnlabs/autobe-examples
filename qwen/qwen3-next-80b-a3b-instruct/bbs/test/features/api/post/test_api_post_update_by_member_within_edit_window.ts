import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_update_by_member_within_edit_window(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a valid topic category for the post
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a new post by the authenticated member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Economic Trends Analysis",
        content:
          "This is a comprehensive analysis of current economic trends and their potential impacts on financial markets.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Update the post within the 24-hour editing window
  const updatedPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.update(connection, {
      postId: post.id,
      body: {
        subject: "Updated Economic Trends Analysis",
        content:
          "This is an updated comprehensive analysis of current economic trends and their potential impacts on financial markets with additional insights.",
      } satisfies IEconomicBoardPost.IUpdate,
    });
  typia.assert(updatedPost);

  // 5. Verify the post was updated correctly
  TestValidator.equals(
    "post subject should be updated",
    updatedPost.subject,
    "Updated Economic Trends Analysis",
  );
  TestValidator.equals(
    "post content should be updated",
    updatedPost.content,
    "This is an updated comprehensive analysis of current economic trends and their potential impacts on financial markets with additional insights.",
  );
  TestValidator.predicate(
    "post should be marked as edited",
    updatedPost.edited === true,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    updatedPost.updated_at > post.created_at,
  );
}
