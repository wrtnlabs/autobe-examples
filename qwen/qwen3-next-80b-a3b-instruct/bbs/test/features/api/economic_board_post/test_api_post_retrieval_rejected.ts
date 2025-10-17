import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_retrieval_rejected(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to create test data
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "bcrypt_hashed_password_abbreviated", // Must be valid bcrypt hash format
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic to associate with the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation", // One of the seven predefined topics
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post that is in 'pending' status by default
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Pending Test Post",
        content: "This post is pending and should be hidden from retrieval.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Validate retrieval of non-published post (pending) returns 404 error
  // According to business rules, any post with status != 'published' returns 404 Not Found
  // This includes pending, rejected, and deleted statuses
  await TestValidator.error(
    "Retrieval of pending post should fail with 404 error",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: post.id,
      });
    },
  );
}
