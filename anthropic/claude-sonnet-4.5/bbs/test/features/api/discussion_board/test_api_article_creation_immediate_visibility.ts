import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that newly created articles are immediately published and visible to all
 * users.
 *
 * This test validates the core business requirement that articles do not
 * require moderation approval before publication. Members can publish directly
 * to the community, enabling timely discussions. The test verifies:
 *
 * 1. Article creation succeeds for authenticated members
 * 2. Articles have deleted_at: null (indicating active/published status)
 * 3. Articles appear immediately in public listings without delays
 * 4. Timestamps are properly initialized (created_at, updated_at)
 * 5. View count starts at 0
 *
 * Business Context: This implements a high-trust community model where
 * moderation occurs post-publication if needed (via update/delete operations),
 * rather than requiring pre-publication approval that would delay community
 * engagement.
 */
export async function test_api_article_creation_immediate_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(2),
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  TestValidator.equals(
    "member email matches registration",
    authenticatedMember.email,
    memberData.email,
  );
  TestValidator.equals(
    "member username matches registration",
    authenticatedMember.username,
    memberData.username,
  );

  // Step 2: Create an article with valid content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Validate article is created with immediate publication status
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches input",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article deleted_at is null (published status)",
    createdArticle.deleted_at,
    null,
  );
  TestValidator.equals(
    "view count initialized to 0",
    createdArticle.view_count,
    0,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    createdArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    createdArticle.updated_at.length > 0,
  );
  TestValidator.equals(
    "author ID matches authenticated member",
    createdArticle.author.id,
    authenticatedMember.id,
  );

  // Step 4: Verify article appears immediately in public listings
  const listingRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardArticle.IRequest;

  const articleListing: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: listingRequest,
    });
  typia.assert(articleListing);

  // Step 5: Confirm the created article is visible in the listing
  const foundArticle = articleListing.data.find(
    (article) => article.id === createdArticle.id,
  );

  TestValidator.predicate(
    "created article found in listing",
    foundArticle !== undefined,
  );

  if (foundArticle) {
    typia.assertGuard(foundArticle);
    TestValidator.equals(
      "listing article ID matches created article",
      foundArticle.id,
      createdArticle.id,
    );
    TestValidator.equals(
      "listing article title matches created article",
      foundArticle.title,
      createdArticle.title,
    );
    TestValidator.equals(
      "listing article author ID matches",
      foundArticle.author.id,
      authenticatedMember.id,
    );
  }
}
