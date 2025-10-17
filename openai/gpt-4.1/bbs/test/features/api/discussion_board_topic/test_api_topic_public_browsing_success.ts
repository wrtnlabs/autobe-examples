import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

/**
 * Validates public browsing of economic/political discussion board topics.
 *
 * Ensures that both unauthenticated (guest) and authenticated users can browse
 * a paginated, filtered list of topic summaries. Covers: posting a topic,
 * public fetching, searching by keyword, author filtering, pagination, and
 * empty result scenarios. Verifies that only summary information is present,
 * and sensitive/member-only fields are not leaked to unauthenticated
 * consumers.
 *
 * 1. Register a new member (for posting)
 * 2. Post a new topic as that member
 * 3. Browse topics as a guest (no filter) and confirm the created topic is present
 * 4. Search by keyword to fetch the topic by title/content
 * 5. Filter by author_member_id to fetch only their topic(s)
 * 6. Check that only summary fields are present (id, subject, author IDs,
 *    created_at, updated_at)
 * 7. Check that pagination info is present and correct
 * 8. Search with an unmatched keyword (should get empty result)
 */
export async function test_api_topic_public_browsing_success(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const newMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
    },
  });
  typia.assert(newMember);
  TestValidator.predicate(
    "member email_verified should be false after join",
    newMember.email_verified === false,
  );

  // 2. Post a topic as that member (assume join logs in for member)
  const topicSubject = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const topicContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 12,
  });
  const postedTopic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: topicSubject,
        content: topicContent,
      },
    },
  );
  typia.assert(postedTopic);
  TestValidator.equals(
    "posted topic subject matches",
    postedTopic.subject,
    topicSubject,
  );
  TestValidator.equals(
    "posted topic content matches",
    postedTopic.content,
    topicContent,
  );
  TestValidator.equals(
    "posted topic author_member_id matches",
    postedTopic.author_member_id,
    newMember.id,
  );

  // 3. Browse public topics as guest (no filters)
  const guestConnection: api.IConnection = { ...connection, headers: {} };
  const page1 = await api.functional.discussionBoard.topics.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 contains the posted topic",
    page1.data.some((t) => t.id === postedTopic.id),
  );
  TestValidator.equals(
    "pagination info present",
    typeof page1.pagination,
    "object",
  );
  // Ensure summary shape: only allowed fields present
  const summaryFields = [
    "id",
    "subject",
    "author_member_id",
    "author_admin_id",
    "created_at",
    "updated_at",
  ] as const;
  const summaryProps = Object.keys(page1.data[0]);
  TestValidator.predicate(
    "only allowed summary fields present",
    summaryProps.every((key) => summaryFields.includes(key as any)),
  );

  // 4. Browse public topics with search by keyword (subject)
  const keyword = RandomGenerator.substring(topicSubject);
  const keywordResult = await api.functional.discussionBoard.topics.index(
    guestConnection,
    {
      body: {
        search: keyword,
      },
    },
  );
  typia.assert(keywordResult);
  TestValidator.predicate(
    "keyword result contains posted topic",
    keywordResult.data.some((t) => t.id === postedTopic.id),
  );

  // 5. Browse via author_member_id
  const authorResult = await api.functional.discussionBoard.topics.index(
    guestConnection,
    {
      body: {
        author_member_id: newMember.id,
      },
    },
  );
  typia.assert(authorResult);
  TestValidator.predicate(
    "author filter result only contains member's topics",
    authorResult.data.every((t) => t.author_member_id === newMember.id),
  );

  // 6. Pagination structure and logic validation
  TestValidator.predicate(
    "pagination has non-negative current",
    authorResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    authorResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records >= data length",
    authorResult.pagination.records >= authorResult.data.length,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    authorResult.pagination.pages >= 1,
  );

  // 7. Search with unmatched keyword (expect empty result)
  const emptyResult = await api.functional.discussionBoard.topics.index(
    guestConnection,
    {
      body: { search: "somerandomkeywordunlikelytomatch" },
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result should have no data",
    emptyResult.data.length,
    0,
  );
}
