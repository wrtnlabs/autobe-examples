import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_article_list_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple articles (5-7 articles)
  const articleCount = 6;
  const createdArticles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < articleCount; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 3,
              wordMax: 8,
            }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId: typia.random<string & tags.Format<"uuid">>(),
            tags: ArrayUtil.repeat(2, () => RandomGenerator.name(1)),
          },
        },
      );
    typia.assert(article);
    createdArticles.push(article);
  }
  // 3. Retrieve article list with default pagination
  const memberArticleList =
    await api.functional.discussionBoard.members.articles.index(
      memberConnection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(memberArticleList);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", memberArticleList.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    memberArticleList.pagination.limit >= 1,
  );
  TestValidator.equals(
    "total records",
    memberArticleList.pagination.records,
    articleCount,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    memberArticleList.pagination.pages >= 1,
  );
  // 5. Validate article count matches
  TestValidator.equals(
    "data array length matches records",
    memberArticleList.data.length,
    articleCount,
  );
  // 6. Validate all articles belong to the member
  for (const article of memberArticleList.data) {
    TestValidator.equals(
      "article author matches member",
      article.author.id,
      member.id,
    );
    TestValidator.predicate("article has id", article.id !== undefined);
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate(
      "article has created_at",
      article.created_at !== undefined,
    );
    TestValidator.predicate(
      "comments_count is non-negative",
      article.comments_count >= 0,
    );
    TestValidator.predicate("tags is array", Array.isArray(article.tags));
  }
  // 7. Test sorting - newest first (default)
  const newestFirst =
    await api.functional.discussionBoard.members.articles.index(
      memberConnection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: articleCount,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(newestFirst);
  // Verify newest articles appear first
  if (newestFirst.data.length >= 2) {
    TestValidator.predicate(
      "newest sort - first article is newer or equal",
      new Date(newestFirst.data[0].created_at).getTime() >=
        new Date(newestFirst.data[1].created_at).getTime(),
    );
  }
  // 8. Test sorting - oldest first
  const oldestFirst =
    await api.functional.discussionBoard.members.articles.index(
      memberConnection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: articleCount,
          sort: "oldest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestFirst);
  // Verify oldest articles appear first
  if (oldestFirst.data.length >= 2) {
    TestValidator.predicate(
      "oldest sort - first article is older or equal",
      new Date(oldestFirst.data[0].created_at).getTime() <=
        new Date(oldestFirst.data[1].created_at).getTime(),
    );
  }
  // 9. Test pagination with different page size
  const paginatedResult =
    await api.functional.discussionBoard.members.articles.index(
      memberConnection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 3,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 3);
  TestValidator.predicate(
    "paginated data respects limit",
    paginatedResult.data.length <= 3,
  );
  TestValidator.equals(
    "paginated records total",
    paginatedResult.pagination.records,
    articleCount,
  );
}
