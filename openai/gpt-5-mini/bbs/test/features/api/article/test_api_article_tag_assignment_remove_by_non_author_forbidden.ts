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

export async function test_api_article_tag_assignment_remove_by_non_author_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validate that a non-author member cannot remove a tag assignment created by
   * another member.
   *
   * Business context:
   *
   * - Moderators create tags used by members to label articles.
   * - Only the article author (or privileged actors) may remove tag assignments.
   * - This test verifies authorization enforcement by ensuring that a different
   *   member cannot remove an assignment made by the article's author.
   *
   * Steps:
   *
   * 1. Moderator signs up and creates a tag.
   * 2. Author member signs up, creates an article, and assigns the tag.
   * 3. Another member signs up and attempts to remove the tag assignment → expect
   *    an error.
   * 4. Confirm the assignment still exists by trying to create the same assignment
   *    again as the original author and expecting a duplicate-assignment
   *    error.
   *
   * Notes:
   *
   * - We create isolated connection clones (modConn, authorConn, otherConn) so
   *   that each join() call stores tokens on its own connection without
   *   touching the shared test harness connection.headers.
   * - Audit/log verification requested by the original scenario is not possible
   *   because no audit retrieval API is provided; instead we verify persistence
   *   of the assignment via duplicate-create error.
   */

  // 1) Moderator creates a tag
  const modConn: api.IConnection = { ...connection, headers: {} };
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ngP@ssw0rd!",
    href: "https://example.com/mod-join",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, { body: moderatorBody });
  typia.assert(moderator);

  const tagBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(8),
    description: null,
  } satisfies IDiscussionBoardTag.ICreate;

  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(modConn, {
      body: tagBody,
    });
  typia.assert(tag);
  TestValidator.predicate(
    "created tag has slug",
    typeof tag.slug === "string" && tag.slug.length > 0,
  );

  // 2) Author member joins, creates an article, and assigns the tag
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ngP@ssw0rd!",
    href: "https://example.com/author-join",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, { body: authorBody });
  typia.assert(author);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(authorConn, {
      body: articleBody,
    });
  typia.assert(article);

  // Assign tag to article as the author
  const assignmentBody = {
    tagSlug: tag.slug,
  } satisfies IDiscussionBoardArticleTag.ICreate;

  const assignment: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.member.articles.tags.create(
      authorConn,
      {
        articleId: article.id,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "assignment tag slug matches created tag",
    assignment.tag.slug,
    tag.slug,
  );

  // 3) Create a second member (unauthorized actor)
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ngP@ssw0rd!",
    href: "https://example.com/other-join",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, { body: otherBody });
  typia.assert(otherMember);

  // 4) As the unauthorized member, attempt to erase the tag assignment → expect an error
  await TestValidator.error(
    "unauthorized member cannot remove another's tag assignment",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.erase(
        otherConn,
        {
          articleId: article.id,
          tagSlug: tag.slug,
        },
      );
    },
  );

  // 5) Verify the assignment remains by attempting to create the same assignment again
  //    as the original author and expecting a duplicate-assignment error.
  await TestValidator.error(
    "assignment still exists: duplicate create should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.create(
        authorConn,
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
