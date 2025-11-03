import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleActivityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleActivityStatistics";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_statistics_article_activity_time_series(
  connection: api.IConnection,
) {
  // Create moderator and category
  const modConn: api.IConnection = { ...connection, headers: {} };
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "http://example.com/scene",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const categoryBody = {
    name: `cat-${RandomGenerator.alphaNumeric(6)}`,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(modConn, {
      body: categoryBody,
    });
  typia.assert(category);

  // Create two members (authors)
  const memberConn1: api.IConnection = { ...connection, headers: {} };
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn1, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "http://example.com/member1",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member1);

  const memberConn2: api.IConnection = { ...connection, headers: {} };
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn2, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "http://example.com/member2",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member2);

  // Create articles for both members. Request 'published' state so server
  // sets published_at within the current time window.
  const articlesByMember1 = await ArrayUtil.asyncRepeat(3, async (i) => {
    const body = {
      title: RandomGenerator.paragraph({
        sentences: 6,
        wordMin: 3,
        wordMax: 8,
      }),
      content: RandomGenerator.content({ paragraphs: 2 }),
      category_slug: category.slug,
      state: "published",
    } satisfies IDiscussionBoardArticle.ICreate;

    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(memberConn1, {
        body,
      });
    typia.assert(article);
    return article;
  });

  const articlesByMember2 = await ArrayUtil.asyncRepeat(2, async (i) => {
    const body = {
      title: RandomGenerator.paragraph({ sentences: 5 }),
      content: RandomGenerator.content({ paragraphs: 1 }),
      category_slug: category.slug,
      state: "published",
    } satisfies IDiscussionBoardArticle.ICreate;

    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(memberConn2, {
        body,
      });
    typia.assert(article);
    return article;
  });

  const createdArticles = [...articlesByMember1, ...articlesByMember2];
  const totalArticles = createdArticles.length;

  // For each article create comments and attachments
  let totalComments = 0;
  let totalAttachments = 0;

  await ArrayUtil.asyncForEach(createdArticles, async (article, idx) => {
    const commentsCount = idx % 2 === 0 ? 3 : 1; // varied counts
    const attachmentsCount = idx % 2 === 0 ? 1 : 0; // some articles have attachments

    // Choose the author's connection based on membership
    const authorConn =
      idx < articlesByMember1.length ? memberConn1 : memberConn2;

    // Create comments
    await ArrayUtil.asyncRepeat(commentsCount, async () => {
      const commentBody = {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardComment.ICreate;

      const comment: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.articles.comments.create(
          authorConn,
          {
            articleId: article.id,
            body: commentBody,
          },
        );
      typia.assert(comment);
      totalComments += 1;
    });

    // Create attachments when applicable
    await ArrayUtil.asyncRepeat(attachmentsCount, async () => {
      const attachBody = {
        original_filename: `file-${RandomGenerator.alphaNumeric(6)}.txt`,
        storage_key: `https://storage.example.com/${RandomGenerator.alphaNumeric(12)}`,
        mime_type: "text/plain",
        size: 1024,
        is_image: false,
      } satisfies IDiscussionBoardAttachment.ICreate;

      const attachment: IDiscussionBoardAttachment =
        await api.functional.discussionBoard.member.articles.attachments.create(
          authorConn,
          {
            articleId: article.id,
            body: attachBody,
          },
        );
      typia.assert(attachment);
      totalAttachments += 1;
    });
  });

  // Call statistics endpoint (no date params supported by SDK; defaults apply)
  const stats: IDiscussionBoardArticleActivityStatistics =
    await api.functional.discussionBoard.statistics.article_activity.articleActivity(
      connection,
    );
  typia.assert(stats);

  // Validate summary metrics
  TestValidator.equals(
    "summary article_count matches created articles",
    stats.summary.article_count,
    totalArticles,
  );
  TestValidator.equals(
    "summary comment_count matches created comments",
    stats.summary.comment_count,
    totalComments,
  );
  TestValidator.equals(
    "summary attachment_count matches created attachments",
    stats.summary.attachment_count,
    totalAttachments,
  );

  // Today's bucket
  const today = new Date().toISOString().slice(0, 10);
  const todayBucket = stats.time_series.find((b) => b.date === today);
  TestValidator.predicate(
    "time_series contains today's bucket",
    todayBucket !== undefined,
  );

  if (todayBucket) {
    TestValidator.equals(
      "today article_count matches",
      todayBucket.article_count,
      totalArticles,
    );
    TestValidator.equals(
      "today comment_count matches",
      todayBucket.comment_count,
      totalComments,
    );
    TestValidator.equals(
      "today attachment_count matches",
      todayBucket.attachment_count,
      totalAttachments,
    );
  }

  // average_comments_per_article: numeric comparison
  if (totalArticles === 0) {
    TestValidator.equals(
      "average_comments_per_article is null when no articles",
      stats.summary.average_comments_per_article,
      null,
    );
  } else {
    const expectedAvg = totalComments / totalArticles;
    TestValidator.predicate(
      "average_comments_per_article approximately equals computed value",
      typeof stats.summary.average_comments_per_article === "number" &&
        Math.abs(stats.summary.average_comments_per_article - expectedAvg) <
          1e-6,
    );
  }
}
