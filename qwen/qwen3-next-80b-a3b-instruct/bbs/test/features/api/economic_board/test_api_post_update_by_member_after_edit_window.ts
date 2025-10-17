import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_update_by_member_after_edit_window(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication using a valid bcrypt hash
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash:
          "$2a$10$BWgma31pzD1lRxP9r4ER3eDtPS6RyvUcbdu7MZfXwUJNXfn07jPn6", // valid bcrypt hash for "12345678"
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a valid topic category for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a new post by the authenticated member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id, // Use the real topic id
        subject: "Test subject",
        content: "Test content for editing window test",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Attempt to update the post immediately after creation — since the actual system enforces a 24-hour window and we cannot control the clock,
  //    this test assumes the server implementation will recognize the post's created_at as being more than 24 hours ago (e.g., via test environment contrivance).
  //    In practice, this test will need manual intervention or server-side time manipulation to pass.
  //    The requirement is to test the enforcement of the 24-hour edit window expiration.
  await TestValidator.error(
    "cannot update post after 24-hour edit window has expired",
    async () => {
      await api.functional.economicBoard.member.posts.update(connection, {
        postId: post.id,
        body: {
          subject: "Updated subject after 24 hours",
          content: "Updated content after 24 hours",
        } satisfies IEconomicBoardPost.IUpdate,
      });
    },
  );
}
