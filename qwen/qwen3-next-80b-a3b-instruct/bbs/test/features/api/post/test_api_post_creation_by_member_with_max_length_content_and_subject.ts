import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member_with_max_length_content_and_subject(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new topic
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Discussion about inflation rates and monetary policy",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post with maximum allowed length subject and content
  const maxLengthSubject: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 7,
    wordMax: 9,
  }).substring(0, 120);

  // Ensure subject has exactly 120 characters (maximum allowed)
  const subject: string =
    maxLengthSubject.length < 120
      ? maxLengthSubject + " ".repeat(120 - maxLengthSubject.length)
      : maxLengthSubject.substring(0, 120);

  // Generate content with maximum allowed length of 5,000 characters
  const maxLengthContent: string = RandomGenerator.content({
    paragraphs: 50,
    sentenceMin: 12,
    sentenceMax: 18,
    wordMin: 4,
    wordMax: 8,
  });

  // Ensure content has exactly 5,000 characters (maximum allowed)
  const content: string =
    maxLengthContent.length < 5000
      ? maxLengthContent + " ".repeat(5000 - maxLengthContent.length)
      : maxLengthContent.substring(0, 5000);

  // Verify length requirements
  TestValidator.equals("subject length is exactly 120", subject.length, 120);
  TestValidator.equals("content length is exactly 5000", content.length, 5000);

  // Step 4: Create the post
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: subject,
        content: content,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Validate post creation
  TestValidator.equals(
    "post subject matches submitted subject",
    post.subject,
    subject,
  );
  TestValidator.equals(
    "post content matches submitted content",
    post.content,
    content,
  );
  TestValidator.equals("post status is pending", post.status, "pending");
  TestValidator.predicate("post has author_hash", post.author_hash !== null);
  TestValidator.equals(
    "post has correct topic ID",
    post.economic_board_topics_id,
    topic.id,
  );
  TestValidator.predicate(
    "created_at is a valid ISO datetime",
    typeof post.created_at === "string" &&
      !Number.isNaN(new Date(post.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO datetime",
    typeof post.updated_at === "string" &&
      !Number.isNaN(new Date(post.updated_at).getTime()),
  );
  TestValidator.equals("reply_count is 0", post.reply_count, 0);
  TestValidator.equals("edited flag is false", post.edited, false);
  TestValidator.predicate("edited_at is null", post.edited_at === null);
}
