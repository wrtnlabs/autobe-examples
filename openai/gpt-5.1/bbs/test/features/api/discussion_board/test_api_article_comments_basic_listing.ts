import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

export async function test_api_article_comments_basic_listing(
  connection: api.IConnection,
) {
  // 1. Admin setup: register an adminUser (auto-authenticated via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Member setup: register memberUser (auto-authenticated via SDK)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates a primary article under the category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. Member creates several comments on the primary article
  const createdComments: IDiscussionBoardComment[] = [];
  const commentCount = 3;

  for (let i = 0; i < commentCount; ++i) {
    const commentBody = {
      body: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.memberUser.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: commentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 6. Create another article and one comment to ensure isolation
  const otherArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const otherArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: otherArticleBody,
      },
    );
  typia.assert(otherArticle);

  const otherCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const otherComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: otherArticle.id,
        body: otherCommentBody,
      },
    );
  typia.assert(otherComment);

  // 7. Invoke listing API for the primary article
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies IDiscussionBoardComment.IRequest;

  const page: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: listRequestBody,
    });
  typia.assert(page);

  const pagination = page.pagination;
  const summaries = page.data;

  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination.limit should be at least created comment count",
    pagination.limit >= createdComments.length,
  );
  TestValidator.predicate(
    "pagination.records should be at least created comment count",
    pagination.records >= createdComments.length,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1 when comments exist",
    pagination.pages >= 1,
  );

  // 9. Validate that all returned summaries belong to the primary article
  for (const summary of summaries) {
    TestValidator.equals(
      "each summary.article.id must match primary article id",
      summary.article.id,
      article.id,
    );
  }

  // 10. Validate that all createdComments are included in the listing
  for (const created of createdComments) {
    const found = summaries.some((s) => s.id === created.id);
    TestValidator.predicate(
      "created comment must be present in listing",
      found,
    );
  }

  // 11. Ensure comments from other article are not included
  const otherFound = summaries.some((s) => s.article.id === otherArticle.id);
  TestValidator.predicate(
    "comments from other articles must not be present in listing",
    otherFound === false,
  );

  // 12. Validate ordering by createdAt ascending
  const sortedByCreatedAt = [...summaries].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );

  TestValidator.equals(
    "listing should be ordered by createdAt ascending",
    summaries,
    sortedByCreatedAt,
  );
}
