import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member_with_excessive_content_length(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a member to submit a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_1234567890",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Ensure a valid topic is available for the post
  const topicName:
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy" = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Attempt to create a post with content exceeding 5,000 characters
  // This should fail with validation error indicating character limit violation
  const excessiveContent = RandomGenerator.content({
    paragraphs: 50, // 50 paragraphs will exceed 5,000 characters
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  // This call should throw an error indicating character limit violation
  await TestValidator.error(
    "should reject post with content exceeding 5000 characters",
    async () => {
      await api.functional.economicBoard.member.posts.create(connection, {
        body: {
          economic_board_topics_id: topic.id,
          subject: "Excessive content test",
          content: excessiveContent,
        } satisfies IEconomicBoardPost.ICreate,
      });
    },
  );
}
