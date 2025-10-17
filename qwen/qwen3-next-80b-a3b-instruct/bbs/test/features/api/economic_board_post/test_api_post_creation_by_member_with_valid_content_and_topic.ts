import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member_with_valid_content_and_topic(
  connection: api.IConnection,
) {
  // Authenticate as a member by joining
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(60);
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: passwordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Create a valid topic from predefined system values
  const topicName: IEconomicBoardTopic.ICreate["name"] =
    typia.random<IEconomicBoardTopic.ICreate["name"]>();
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Create a post with minimum valid subject (5 chars) and content (10 chars)
  const minimalSubject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 5,
  });
  const minimalContent = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 10,
  });
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: minimalSubject,
        content: minimalContent,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Validate post properties
  TestValidator.equals("status should be pending", post.status, "pending");
  TestValidator.predicate(
    "author_hash should be non-null",
    post.author_hash !== null,
  );
  TestValidator.equals(
    "subject length should be exactly 5",
    post.subject.length,
    5,
  );
  TestValidator.equals(
    "content length should be exactly 10",
    post.content.length,
    10,
  );
  TestValidator.equals("edited should be false", post.edited, false);
  TestValidator.equals("reply_count should be 0", post.reply_count, 0);
}
