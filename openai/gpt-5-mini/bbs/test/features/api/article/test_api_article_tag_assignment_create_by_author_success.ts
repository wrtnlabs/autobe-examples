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

export async function test_api_article_tag_assignment_create_by_author_success(
  connection: api.IConnection,
) {
  // 1) Moderator signs up (creates moderator token on connection)
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: typia.random<IDiscussionBoardModerator.ICreate>(),
    });
  typia.assert(moderator);

  // 2) Moderator creates a tag with a controlled slug
  const tagSlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const tagBody = {
    name: RandomGenerator.name(),
    slug: tagSlug,
  } satisfies IDiscussionBoardTag.ICreate;

  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tagBody,
    });
  typia.assert(tag);
  TestValidator.equals("created tag slug matches request", tag.slug, tagSlug);

  // 3) Member signs up (connection Authorization overwritten with member token)
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    });
  typia.assert(member);

  // 4) Member creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 5) As the article author, assign the tag by slug
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

  // Business validations
  TestValidator.equals(
    "assignment links to correct article",
    assignment.article.id,
    article.id,
  );
  TestValidator.equals(
    "assignment links to correct tag",
    assignment.tag.id,
    tag.id,
  );

  // createdBy must be set server-side to the authenticated member
  const createdBy = typia.assert<IDiscussionBoardMember.ISummary>(
    assignment.createdBy!,
  );
  TestValidator.equals(
    "assignment.createdBy matches authenticated member",
    createdBy.id,
    member.id,
  );

  // 6) Uniqueness: attempting to create the same assignment again should fail
  await TestValidator.error("duplicate assignment should fail", async () => {
    await api.functional.discussionBoard.member.articles.tags.create(
      connection,
      {
        articleId: article.id,
        body: {
          tagSlug: tag.slug,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
}
