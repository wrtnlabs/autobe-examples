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
  // 1. Authenticate as a member to create a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashedpassword123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a valid economic topic
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

  // 3. Create a new post with valid subject and content
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Validate post properties
  TestValidator.equals("status should be pending", post.status, "pending");
  TestValidator.predicate(
    "subject length is between 5 and 120",
    post.subject.length >= 5 && post.subject.length <= 120,
  );
  TestValidator.predicate(
    "content length is between 10 and 5000",
    post.content.length >= 10 && post.content.length <= 5000,
  );
  TestValidator.equals(
    "author_hash should be generated",
    post.author_hash !== null,
    true,
  );
  TestValidator.equals("admin_id should be null", post.admin_id, null);
  TestValidator.equals(
    "moderation_reason should be null",
    post.moderation_reason,
    null,
  );
  TestValidator.equals("reply_count should be 0", post.reply_count, 0);
  TestValidator.equals("edited should be false", post.edited, false);
  TestValidator.equals("edited_at should be null", post.edited_at, null);
}
