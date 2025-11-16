import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test creating nested reply comments that support threaded discussions within
 * economic and political articles.
 *
 * Validates the reply system supports up to 3 levels of nesting depth and
 * maintains proper parent-child relationships for organized conversation
 * threading within complex economic discussions.
 *
 * This test follows a complete workflow:
 *
 * 1. Join as a member to get authenticated access
 * 2. Create an article to serve as the discussion context
 * 3. Create a parent comment on the article
 * 4. Create multiple reply comments to test nesting depth (up to 3 levels)
 * 5. Verify parent-child relationships are correctly established
 * 6. Validate comment structure and relationships
 *
 * The test ensures that nested comment replies maintain proper hierarchical
 * structure, support multi-level threading, and correctly associate parent
 * comments with their replies within the economic discussion platform.
 */
export async function test_api_nested_comment_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Join as member to get authenticated access
  const memberData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 2: Create an article to serve as discussion context
  const articleData = {
    title: "Economic Policy Analysis: Inflation and Monetary Policy",
    content: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  TestValidator.predicate(
    "article has required fields",
    !!article.id && !!article.title && !!article.content,
  );

  // Step 3: Create parent comment (Level 1)
  const parentCommentData = {
    article_id: article.id,
    content:
      "This article provides an interesting perspective on current monetary policy. I believe inflation control should be prioritized.",
    parent_comment_id: null,
  } satisfies IEconomicDiscussionComment.ICreate;

  const parentComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: parentCommentData,
      },
    );
  typia.assert(parentComment);

  TestValidator.predicate(
    "parent comment has no parent_id",
    parentComment.parent_id === null || parentComment.parent_id === undefined,
  );

  // Step 4: Create first-level reply (Level 2)
  const reply1Data = {
    article_id: article.id,
    content:
      "I disagree with your inflation prioritization. Employment rates should be considered equally important.",
    parent_comment_id: parentComment.id,
  } satisfies IEconomicDiscussionComment.ICreate;

  const reply1 =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: reply1Data,
      },
    );
  typia.assert(reply1);

  TestValidator.equals(
    "first reply parent_id matches parent comment",
    reply1.parent_id,
    parentComment.id,
  );

  // Step 5: Create second-level reply (Level 3)
  const reply2Data = {
    article_id: article.id,
    content:
      "Both perspectives have merit. Perhaps we need a balanced approach considering both inflation and employment data.",
    parent_comment_id: reply1.id,
  } satisfies IEconomicDiscussionComment.ICreate;

  const reply2 =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: reply2Data,
      },
    );
  typia.assert(reply2);

  TestValidator.equals(
    "second reply parent_id matches first reply",
    reply2.parent_id,
    reply1.id,
  );
  TestValidator.notEquals(
    "second reply ID differs from first reply",
    reply2.id,
    reply1.id,
  );

  // Step 6: Create another top-level comment to test multiple conversation threads
  const secondParentData = {
    article_id: article.id,
    content:
      "The data sources cited in this analysis are quite dated. More recent studies show different patterns.",
    parent_comment_id: null,
  } satisfies IEconomicDiscussionComment.ICreate;

  const secondParent =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: secondParentData,
      },
    );
  typia.assert(secondParent);

  TestValidator.equals(
    "second parent has no parent_id",
    secondParent.parent_id,
    null,
  );

  // Step 7: Create reply to second parent
  const replyToSecondData = {
    article_id: article.id,
    content:
      "Could you provide links to these more recent studies? I'm interested in reviewing them.",
    parent_comment_id: secondParent.id,
  } satisfies IEconomicDiscussionComment.ICreate;

  const replyToSecond =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: replyToSecondData,
      },
    );
  typia.assert(replyToSecond);

  TestValidator.equals(
    "reply to second parent matches second parent ID",
    replyToSecond.parent_id,
    secondParent.id,
  );
  TestValidator.notEquals(
    "reply to second parent differs from first reply",
    replyToSecond.id,
    reply1.id,
  );

  // Step 8: Validate comment content requirements
  TestValidator.predicate(
    "parent comment meets minimum content length",
    parentComment.content.length >= 10,
  );

  TestValidator.predicate(
    "all comments are approved status",
    parentComment.status === "approved" &&
      reply1.status === "approved" &&
      reply2.status === "approved" &&
      secondParent.status === "approved" &&
      replyToSecond.status === "approved",
  );

  // Step 9: Verify nested structure integrity
  TestValidator.predicate(
    "article ID is consistent across all comments",
    parentComment.economic_discussion_article_id === article.id &&
      reply1.economic_discussion_article_id === article.id &&
      reply2.economic_discussion_article_id === article.id &&
      secondParent.economic_discussion_article_id === article.id &&
      replyToSecond.economic_discussion_article_id === article.id,
  );

  // Step 10: Validate member authorship
  const memberSummary = memberAuth.member;
  TestValidator.predicate(
    "member ID is consistent across comments",
    parentComment.economic_discussion_member_id === memberSummary.id &&
      reply1.economic_discussion_member_id === memberSummary.id &&
      reply2.economic_discussion_member_id === memberSummary.id &&
      secondParent.economic_discussion_member_id === memberSummary.id &&
      replyToSecond.economic_discussion_member_id === memberSummary.id,
  );

  // Step 11: Validate timestamps and IDs
  TestValidator.predicate(
    "all comments have valid UUIDs",
    !!typia.is<string & tags.Format<"uuid">>(parentComment.id) &&
      !!typia.is<string & tags.Format<"uuid">>(reply1.id) &&
      !!typia.is<string & tags.Format<"uuid">>(reply2.id) &&
      !!typia.is<string & tags.Format<"uuid">>(secondParent.id) &&
      !!typia.is<string & tags.Format<"uuid">>(replyToSecond.id),
  );

  TestValidator.predicate(
    "created_at timestamps are valid date-time format",
    !!typia.is<string & tags.Format<"date-time">>(parentComment.created_at) &&
      !!typia.is<string & tags.Format<"date-time">>(reply1.created_at) &&
      !!typia.is<string & tags.Format<"date-time">>(reply2.created_at) &&
      !!typia.is<string & tags.Format<"date-time">>(secondParent.created_at) &&
      !!typia.is<string & tags.Format<"date-time">>(replyToSecond.created_at),
  );
}
