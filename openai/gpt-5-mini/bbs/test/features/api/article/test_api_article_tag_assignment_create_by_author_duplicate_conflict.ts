import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_tag_assignment_create_by_author_duplicate_conflict(
  connection: api.IConnection,
) {
  /**
   * Validate duplicate tag assignment conflict from article author.
   *
   * Steps:
   *
   * 1. Create moderator and a tag (moderator actor required to create tags).
   * 2. Create a member (author) and an article.
   * 3. As the author, assign the tag to the article (expect success, 201).
   * 4. Repeat the identical assignment and assert the server rejects it (duplicate
   *    junction → error). Do NOT assert on HTTP status codes; instead assert
   *    that an error is thrown.
   *
   * Validation:
   *
   * - Typia.assert on every non-void response
   * - Assignment.createdBy id matches the authenticated member id
   * - Second identical assignment produces an error (caught by
   *   TestValidator.error)
   */

  // 1) Moderator signs up to create a tag
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "P@ssword12345",
        href: "https://example.com/moderator/onboard",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2) Moderator creates a tag for later assignment
  const tagSlug = RandomGenerator.alphabets(8); // lowercase letters, URL friendly
  const tagBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    slug: tagSlug,
    description: null,
  } satisfies IDiscussionBoardTag.ICreate;

  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tagBody,
    });
  typia.assert(tag);

  // 3) Member (author) signs up
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: "MemberPassw0rd!",
        href: "https://example.com/member/signup",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 4) Member creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // Ensure article has an id and author summary exists when possible
  TestValidator.predicate(
    "article has id",
    article.id !== undefined && article.id !== null,
  );

  // 5) As the author, assign the tag to the article (first attempt) - should succeed
  const assignment: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.member.articles.tags.create(
      connection,
      {
        articleId: article.id,
        body: {
          tagSlug: tag.slug,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(assignment);

  // Validate createdBy member id matches the authenticated member id
  TestValidator.equals(
    "assignment created_by id matches member id",
    assignment.createdBy?.id ?? null,
    member.id,
  );

  // 6) Repeat the identical POST; expect a business error (duplicate assignment)
  await TestValidator.error(
    "duplicate tag assignment should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.create(
        connection,
        {
          articleId: article.id,
          body: {
            tagSlug: tag.slug,
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    },
  );
}
