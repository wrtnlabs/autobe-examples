import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as a registered member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Ensure a valid topic exists in the system (Inflation)
  // Static values from schema: "Inflation", "Tax Policy", "Elections", "Global Trade", "Monetary Policy", "Labor Markets", "Fiscal Policy"
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation", // Exact enum value from schema
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a new post with valid data
  const subject: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  }); // Between 5-120 characters
  const content: string = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 7,
  }); // Between 10-5,000 characters

  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id, // Use the created topic's ID
        subject, // Subject between 5-120 chars
        content, // Content between 10-5000 chars
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Validate response properties
  TestValidator.equals("post status should be pending", post.status, "pending");
  TestValidator.predicate(
    "subject length within limits",
    post.subject.length >= 5 && post.subject.length <= 120,
  );
  TestValidator.predicate(
    "content length within limits",
    post.content.length >= 10 && post.content.length <= 5000,
  );
  TestValidator.equals(
    "author_hash should be null (authenticated member)",
    post.author_hash,
    null,
  );
  TestValidator.equals(
    "admin_id should be null (not moderated yet)",
    post.admin_id,
    null,
  );
  TestValidator.equals(
    "moderation_reason should be null (not moderated yet)",
    post.moderation_reason,
    null,
  );
  TestValidator.equals(
    "topic ID matches",
    post.economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals(
    "edited flag should be false (new post)",
    post.edited,
    false,
  );
  TestValidator.equals(
    "edited_at should be null (no edits yet)",
    post.edited_at,
    null,
  );
}
