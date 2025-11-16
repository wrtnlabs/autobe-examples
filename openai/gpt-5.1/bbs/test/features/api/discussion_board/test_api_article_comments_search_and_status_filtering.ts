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

/**
 * Validate search and status filtering behavior of article comments listing.
 *
 * Business flow:
 *
 * 1. Register an admin user and a member user, relying on SDK auth helpers to
 *    attach tokens.
 * 2. As admin, create an article category.
 * 3. As member user, create an article in that category.
 * 4. As the same member user, create multiple comments on that article with bodies
 *    containing different keywords (some with "economy" and others with
 *    "politics").
 * 5. Call the comments listing endpoint with a search term "economy" and no status
 *    filter and verify that only comments whose body contains the keyword are
 *    returned, scoped to the correct article, and that pagination metadata is
 *    consistent with the result size.
 * 6. Discover one or more status values from the created comments via an
 *    unfiltered listing call; pick one status value.
 * 7. Call the listing endpoint again with search omitted and status set to the
 *    chosen value, verifying that all returned comments have that status and
 *    belong to the article, and that pagination is self-consistent.
 * 8. If a second distinct status exists, call the endpoint once more with that
 *    other status and verify that the resulting comment ids differ from the
 *    first status-filtered set, demonstrating that status filtering changes the
 *    view.
 * 9. In all listing calls, request orderBy="created_at" and orderDirection="asc"
 *    and verify that the resulting comments are non-decreasing by createdAt.
 */
export async function test_api_article_comments_search_and_status_filtering(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) - token automatically stored in connection.headers
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!1" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
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

  // 2. As admin, create an article category
  const categoryBody = {
    code: `ECONOMY_${RandomGenerator.alphaNumeric(8)}`,
    name: "Economy Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Register member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!1",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create an article in the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. Create multiple comments (with and without the keyword "economy")
  const keyword = "economy";

  const economyBodies: string[] = ArrayUtil.repeat(3, () => {
    const prefix = RandomGenerator.paragraph({ sentences: 2 });
    const suffix = RandomGenerator.paragraph({ sentences: 2 });
    return `${prefix} ${keyword} ${suffix}`;
  });

  const politicsBodies: string[] = ArrayUtil.repeat(3, () => {
    const prefix = RandomGenerator.paragraph({ sentences: 2 });
    const suffix = RandomGenerator.paragraph({ sentences: 2 });
    return `${prefix} politics ${suffix}`;
  });

  const allBodies: string[] = [...economyBodies, ...politicsBodies];

  const createdComments: IDiscussionBoardComment[] = await ArrayUtil.asyncMap(
    allBodies,
    async (bodyText, index) => {
      const createBody = {
        body: bodyText,
      } satisfies IDiscussionBoardComment.ICreate;

      const comment: IDiscussionBoardComment =
        await api.functional.discussionBoard.memberUser.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: createBody,
          },
        );
      typia.assert(comment);

      TestValidator.equals(
        `created comment belongs to correct article [index=${index}]`,
        comment.article.id,
        article.id,
      );

      return comment;
    },
  );

  // 6. Initial unfiltered listing to discover statuses and verify scoping
  const initialList: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        orderBy: "created_at",
        orderDirection: "asc",
        search: undefined,
        status: undefined,
      },
    });
  typia.assert(initialList);

  const paginationInitial: IPage.IPagination = initialList.pagination;
  TestValidator.predicate(
    "initial listing pagination has non-negative records",
    paginationInitial.records >= 0,
  );

  // Verify all comments belong to the same article and ordering by createdAt asc
  const initialData = initialList.data;
  for (let i = 0; i < initialData.length; i++) {
    const summary = initialData[i];
    TestValidator.equals(
      `initial listing comment belongs to target article [index=${i}]`,
      summary.article.id,
      article.id,
    );
  }
  for (let i = 1; i < initialData.length; i++) {
    const prev = initialData[i - 1];
    const curr = initialData[i];
    TestValidator.predicate(
      `initial listing is ordered by createdAt asc [index=${i}]`,
      prev.createdAt <= curr.createdAt,
    );
  }

  // Collect distinct status values from the fully created comments
  const statusById = new Map<string, string>();
  for (const comment of createdComments) {
    statusById.set(comment.id, comment.status);
  }

  const distinctStatuses: string[] = [];
  for (const comment of createdComments) {
    const status = comment.status;
    if (!distinctStatuses.includes(status)) distinctStatuses.push(status);
  }

  TestValidator.predicate(
    "at least one status value discovered",
    distinctStatuses.length >= 1,
  );

  const primaryStatus: string = distinctStatuses[0];
  const secondaryStatus: string | undefined =
    distinctStatuses.length > 1 ? distinctStatuses[1] : undefined;

  // 7. Search filtering: search="economy" without status
  const searchList: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        orderBy: "created_at",
        orderDirection: "asc",
        search: keyword,
        status: undefined,
      },
    });
  typia.assert(searchList);

  const searchPagination: IPage.IPagination = searchList.pagination;
  const searchData = searchList.data;

  TestValidator.equals(
    "search listing records equals data length (single page)",
    searchPagination.records,
    searchData.length,
  );

  for (let i = 0; i < searchData.length; i++) {
    const summary = searchData[i];
    TestValidator.equals(
      `search listing comment belongs to target article [index=${i}]`,
      summary.article.id,
      article.id,
    );
    TestValidator.predicate(
      `search listing comment body contains keyword '${keyword}' [index=${i}]`,
      createdComments.some(
        (c) => c.id === summary.id && c.body.includes(keyword),
      ),
    );
  }

  for (let i = 1; i < searchData.length; i++) {
    const prev = searchData[i - 1];
    const curr = searchData[i];
    TestValidator.predicate(
      `search listing is ordered by createdAt asc [index=${i}]`,
      prev.createdAt <= curr.createdAt,
    );
  }

  // 8. Status-only filtering with primaryStatus (no search)
  const statusList: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        orderBy: "created_at",
        orderDirection: "asc",
        search: undefined,
        status: primaryStatus,
      },
    });
  typia.assert(statusList);

  const statusPagination: IPage.IPagination = statusList.pagination;
  const statusData = statusList.data;

  TestValidator.equals(
    "status listing records equals data length (single page) for primary status",
    statusPagination.records,
    statusData.length,
  );

  for (let i = 0; i < statusData.length; i++) {
    const summary = statusData[i];
    TestValidator.equals(
      `status listing (primary) belongs to target article [index=${i}]`,
      summary.article.id,
      article.id,
    );
    TestValidator.equals(
      `status listing (primary) has expected status [index=${i}]`,
      statusById.get(summary.id),
      primaryStatus,
    );
  }

  for (let i = 1; i < statusData.length; i++) {
    const prev = statusData[i - 1];
    const curr = statusData[i];
    TestValidator.predicate(
      `status listing (primary) ordered by createdAt asc [index=${i}]`,
      prev.createdAt <= curr.createdAt,
    );
  }

  // 9. If a secondary status exists, verify that filtering by it yields a different set
  if (secondaryStatus !== undefined) {
    const secondaryList: IPageIDiscussionBoardComment.ISummary =
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: article.id,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 50 as number & tags.Type<"int32">,
          orderBy: "created_at",
          orderDirection: "asc",
          search: undefined,
          status: secondaryStatus,
        },
      });
    typia.assert(secondaryList);

    const secondaryData = secondaryList.data;

    for (let i = 0; i < secondaryData.length; i++) {
      const summary = secondaryData[i];
      TestValidator.equals(
        `status listing (secondary) belongs to target article [index=${i}]`,
        summary.article.id,
        article.id,
      );
      TestValidator.equals(
        `status listing (secondary) has expected secondary status [index=${i}]`,
        statusById.get(summary.id),
        secondaryStatus,
      );
    }

    // Ensure that the set of ids for secondary status does not overlap with primary status ids
    const primaryIds = statusData.map((s) => s.id);
    const secondaryIds = secondaryData.map((s) => s.id);
    const hasOverlap = secondaryIds.some((id) => primaryIds.includes(id));

    TestValidator.predicate(
      "primary and secondary status result sets should be disjoint",
      hasOverlap === false,
    );
  }
}
