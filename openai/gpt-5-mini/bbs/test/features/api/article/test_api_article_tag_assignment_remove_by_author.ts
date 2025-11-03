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

export async function test_api_article_tag_assignment_remove_by_author(
  connection: api.IConnection,
) {
  /**
   * Validate that an article's tag assignment can be removed by the article
   * author. Implementation notes:
   *
   * - Because the provided SDK lacks an audit-log read endpoint, this test
   *   verifies the deletion by attempting to recreate the same assignment after
   *   erase. A successful re-creation (with a different assignment id)
   *   demonstrates that the previous association was removed.
   */

  // 1) Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod${RandomGenerator.alphaNumeric(6)}`;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "Str0ngMod!Pass12",
        href: "http://example.com/",
        referrer: "http://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2) Moderator creates a tag
  const tagSlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const tagName = RandomGenerator.paragraph({ sentences: 2 });
  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
        slug: tagSlug,
        description: null,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag);
  TestValidator.equals("created tag slug matches", tag.slug, tagSlug);

  // 3) Member (article author) signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `mem${RandomGenerator.alphaNumeric(6)}`;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "AuthMember!Pass123",
        href: "http://example.com/",
        referrer: "http://example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 4) Member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 5) Member assigns the created tag to the article
  const assignment1: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.member.articles.tags.create(
      connection,
      {
        articleId: article.id,
        body: {
          tagSlug,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(assignment1);
  TestValidator.equals(
    "assignment article id matches",
    assignment1.article.id,
    article.id,
  );
  TestValidator.equals(
    "assignment tag slug matches",
    assignment1.tag.slug,
    tagSlug,
  );

  // 6) Member erases the tag assignment
  await api.functional.discussionBoard.member.articles.tags.erase(connection, {
    articleId: article.id,
    tagSlug,
  });

  // 7) Verify the assignment was removed by re-creating the same assignment.
  // If erase succeeded, creating the assignment again should succeed and
  // produce a different assignment id than the original assignment.
  const assignment2: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.member.articles.tags.create(
      connection,
      {
        articleId: article.id,
        body: {
          tagSlug,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(assignment2);
  TestValidator.notEquals(
    "assignment id should differ after deletion and recreation",
    assignment1.id,
    assignment2.id,
  );
}
