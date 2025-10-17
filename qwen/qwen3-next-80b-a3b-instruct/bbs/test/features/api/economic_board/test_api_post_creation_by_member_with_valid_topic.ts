import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member_with_valid_topic(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password_hash: typia.random<string>(),
    } satisfies IEconomicBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Ensure a valid topic exists (Inflation)
  const topic = await api.functional.economicBoard.admin.topics.create(
    connection,
    {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 3: Create a post with valid topic, subject, and content
  const post = await api.functional.economicBoard.member.posts.create(
    connection,
    {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 15,
        }), // Ensuring 5-120 chars
        content: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 3,
          wordMax: 12,
        }), // Ensuring 10-5000 chars
      } satisfies IEconomicBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Validate response properties that are not covered by type assertion
  TestValidator.equals("post status should be pending", post.status, "pending");
  TestValidator.predicate(
    "post created_at should be in valid ISO 8601 format",
    () => {
      const date = new Date(post.created_at);
      return !isNaN(date.getTime()) && post.created_at === date.toISOString();
    },
  );
  TestValidator.equals(
    "post should have no author_hash for authenticated member",
    post.author_hash,
    null,
  );
  TestValidator.equals(
    "post's topic ID matches created topic",
    post.economic_board_topics_id,
    topic.id,
  );
  TestValidator.notEquals("post should have a generated UUID", post.id, "");
}
