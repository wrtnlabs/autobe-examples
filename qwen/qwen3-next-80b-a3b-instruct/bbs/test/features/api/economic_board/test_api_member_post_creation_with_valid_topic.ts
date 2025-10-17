import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_member_post_creation_with_valid_topic(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  // Generated bcrypt hash (typical 60-character format)
  const passwordHash: string = "$2a$10$" + RandomGenerator.alphaNumeric(54);
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: passwordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a predefined topic (Inflation)
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a new post with the valid topic
  const subject = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const content = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject,
        content,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Validate post creation with explicit constraints from schema
  TestValidator.equals("post status should be pending", post.status, "pending");
  TestValidator.equals(
    "post topic ID matches",
    post.economic_board_topics_id,
    topic.id,
  );
  TestValidator.predicate(
    "subject length is valid",
    post.subject.length >= 5 && post.subject.length <= 120,
  );
  TestValidator.predicate(
    "content length is valid",
    post.content.length >= 10 && post.content.length <= 5000,
  );
  TestValidator.predicate(
    "author_hash should be generated",
    post.author_hash !== null,
  );
}
