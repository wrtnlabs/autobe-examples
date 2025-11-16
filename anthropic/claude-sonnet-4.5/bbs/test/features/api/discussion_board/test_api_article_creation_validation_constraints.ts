import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article creation validation constraints for discussion board.
 *
 * Validates that the article creation endpoint properly enforces title and body
 * length constraints and handles various content scenarios including boundary
 * conditions, typical use cases, and rich text formatting.
 *
 * Test workflow:
 *
 * 1. Create and authenticate member account
 * 2. Test minimum length boundaries (title: 5 chars, body: 10 chars)
 * 3. Test maximum length boundaries (title: 200 chars, body: approaching 50k
 *    chars)
 * 4. Test typical moderate-length content
 * 5. Test rich text formatting with multiple paragraphs
 * 6. Validate response metadata (view_count, timestamps, author details)
 */
export async function test_api_article_creation_validation_constraints(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "secure_password_123";
  const memberUsername = RandomGenerator.name(1);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test minimum length boundary - title: 5 chars, body: 10 chars
  const minArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Trade",
        body: "Discussion",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(minArticle);

  TestValidator.equals("minimum title length", minArticle.title.length, 5);
  TestValidator.equals("minimum body length", minArticle.body.length, 10);
  TestValidator.equals("initial view count is zero", minArticle.view_count, 0);
  TestValidator.equals(
    "created_at equals updated_at",
    minArticle.created_at,
    minArticle.updated_at,
  );
  TestValidator.equals(
    "author id matches member",
    minArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches",
    minArticle.author.username,
    member.username,
  );
  TestValidator.equals(
    "author email matches",
    minArticle.author.email,
    member.email,
  );

  // Step 3: Test maximum length boundary - title: 200 chars
  const maxTitleText = RandomGenerator.paragraph({
    sentences: 30,
    wordMin: 5,
    wordMax: 8,
  }).substring(0, 200);

  const maxBodyText = RandomGenerator.content({
    paragraphs: 100,
    sentenceMin: 50,
    sentenceMax: 80,
    wordMin: 6,
    wordMax: 10,
  }).substring(0, 49000);

  const maxArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: maxTitleText,
        body: maxBodyText,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(maxArticle);

  TestValidator.equals("maximum title length", maxArticle.title.length, 200);
  TestValidator.predicate(
    "body approaching max length",
    maxArticle.body.length >= 45000,
  );
  TestValidator.equals(
    "view count initialized to zero",
    maxArticle.view_count,
    0,
  );
  TestValidator.equals(
    "timestamps equal for new article",
    maxArticle.created_at,
    maxArticle.updated_at,
  );

  // Step 4: Test typical moderate-length content
  const typicalTitle = "Impact of Inflation on Small Business Growth";
  const typicalBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 8,
  });

  const typicalArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: typicalTitle,
        body: typicalBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(typicalArticle);

  TestValidator.equals(
    "typical title preserved",
    typicalArticle.title,
    typicalTitle,
  );
  TestValidator.predicate(
    "typical body length reasonable",
    typicalArticle.body.length >= 500 && typicalArticle.body.length <= 2000,
  );
  TestValidator.equals(
    "view count starts at zero",
    typicalArticle.view_count,
    0,
  );

  // Step 5: Test rich text formatting with multiple paragraphs and line breaks
  const paragraph1 = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 8,
  });
  const paragraph2 = RandomGenerator.paragraph({
    sentences: 12,
    wordMin: 4,
    wordMax: 7,
  });
  const paragraph3 = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 6,
    wordMax: 9,
  });
  const richTextBody = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;

  const richTextArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Comprehensive Economic Policy Analysis with Multiple Sections",
        body: richTextBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(richTextArticle);

  TestValidator.predicate(
    "rich text formatting preserved",
    richTextArticle.body.includes("\n\n"),
  );
  TestValidator.equals(
    "rich text body matches input",
    richTextArticle.body,
    richTextBody,
  );
  TestValidator.equals(
    "author details complete",
    richTextArticle.author.username,
    member.username,
  );
  TestValidator.predicate(
    "author email verified status present",
    typeof richTextArticle.author.email_verified === "boolean",
  );

  // Step 6: Additional validation - Unicode characters
  const unicodeTitle = "国际经济政策分析报告";
  const unicodeBody = RandomGenerator.paragraph({ sentences: 15 });

  const unicodeArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: unicodeTitle,
        body: unicodeBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(unicodeArticle);

  TestValidator.equals(
    "unicode title preserved",
    unicodeArticle.title,
    unicodeTitle,
  );
  TestValidator.predicate(
    "unicode characters supported",
    unicodeArticle.title.length > 0,
  );
}
