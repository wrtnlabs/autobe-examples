import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_search_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IAdmin.IAuthorized = await authorize_admin_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(moderator);
  // Step 2: Search articles with comprehensive filters
  // Search all articles with default filters
  const allArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        q: undefined,
        category_id: undefined,
        status: undefined,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allArticles);
  // Verify pagination metadata and at least some articles are returned
  TestValidator.equals("pagination current", allArticles.pagination.current, 1);
  TestValidator.equals("pagination limit", allArticles.pagination.limit, 100);
  TestValidator.predicate(
    "at least one article exists",
    allArticles.data.length > 0,
  );
  // Verify all article statuses are accessible to moderator
  TestValidator.predicate(
    "contains draft",
    allArticles.data.some((a) => a.status === "draft"),
  );
  TestValidator.predicate(
    "contains pending",
    allArticles.data.some((a) => a.status === "pending"),
  );
  TestValidator.predicate(
    "contains published",
    allArticles.data.some((a) => a.status === "published"),
  );
  TestValidator.predicate(
    "contains hidden",
    allArticles.data.some((a) => a.status === "hidden"),
  );
  TestValidator.predicate(
    "contains deleted",
    allArticles.data.some((a) => a.status === "deleted"),
  );
  // Search by category_id
  const validCategory = allArticles.data.find((a) => a.category?.id);
  if (validCategory && validCategory.category?.id) {
    const categoryId = validCategory.category.id; // Extract and narrow the id
    const categoryArticles =
      await api.functional.discussionBoard.articles.index(moderatorConnection, {
        body: {
          category_id: categoryId, // Use the narrowed variable
          q: undefined,
          status: undefined,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(categoryArticles);
    TestValidator.predicate(
      "filtered articles contain category",
      categoryArticles.data.every(
        (a) => a.category?.id === categoryId, // Use the narrowed variable, not the original property
      ),
    );
  }
  // Search by q (search query)
  const validTitle = allArticles.data.find(
    (a) => a.title && a.title.length > 5,
  );
  if (validTitle && validTitle.title) {
    const searchArticles = await api.functional.discussionBoard.articles.index(
      moderatorConnection,
      {
        body: {
          q: validTitle.title.substring(0, 5),
          status: undefined,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(searchArticles);
    TestValidator.predicate(
      "search results contain matching title",
      searchArticles.data.some((a) =>
        a.title.includes(validTitle.title.substring(0, 5)),
      ),
    );
  }
  // Search by status filter - draft
  const draftArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        status: "draft",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(draftArticles);
  TestValidator.predicate(
    "draft articles exist",
    draftArticles.data.length > 0,
  );
  TestValidator.predicate(
    "all draft articles have draft status",
    draftArticles.data.every((a) => a.status === "draft"),
  );
  // Search by status filter - pending
  const pendingArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(pendingArticles);
  TestValidator.predicate(
    "pending articles exist",
    pendingArticles.data.length > 0,
  );
  TestValidator.predicate(
    "all pending articles have pending status",
    pendingArticles.data.every((a) => a.status === "pending"),
  );
  // Search by status filter - published
  const publishedArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        status: "published",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(publishedArticles);
  TestValidator.predicate(
    "published articles exist",
    publishedArticles.data.length > 0,
  );
  TestValidator.predicate(
    "all published articles have published status",
    publishedArticles.data.every((a) => a.status === "published"),
  );
  // Search by status filter - hidden
  const hiddenArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        status: "hidden",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(hiddenArticles);
  TestValidator.predicate(
    "hidden articles exist",
    hiddenArticles.data.length > 0,
  );
  TestValidator.predicate(
    "all hidden articles have hidden status",
    hiddenArticles.data.every((a) => a.status === "hidden"),
  );
  // Search by status filter - deleted
  const deletedArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        status: "deleted",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(deletedArticles);
  TestValidator.predicate(
    "deleted articles exist",
    deletedArticles.data.length > 0,
  );
  TestValidator.predicate(
    "all deleted articles have deleted status",
    deletedArticles.data.every((a) => a.status === "deleted"),
  );
  // Verify that searching with date ranges includes articles within range
  const validCreated = allArticles.data.find((a) => a.created_at);
  if (validCreated && validCreated.created_at) {
    const createdAt = new Date(validCreated.created_at);
    const minDate = new Date(
      createdAt.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const maxDate = new Date(
      createdAt.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const dateRangeArticles =
      await api.functional.discussionBoard.articles.index(moderatorConnection, {
        body: {
          min_publish_date: minDate,
          max_publish_date: maxDate,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(dateRangeArticles);
    TestValidator.predicate(
      "date range includes article",
      dateRangeArticles.data.some((a) => a.id === validCreated.id),
    );
  }
  // Verify correct pagination when limiting results
  const limitedArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        q: undefined,
        status: undefined,
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limitedArticles);
  TestValidator.equals(
    "limited articles count",
    limitedArticles.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current for limited",
    limitedArticles.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    limitedArticles.pagination.pages >= 1,
  );
  // Verify that admin can search with author_id
  const validAuthor = allArticles.data.find((a) => a.author?.id);
  if (validAuthor && validAuthor.author?.id) {
    const authorArticles = await api.functional.discussionBoard.articles.index(
      moderatorConnection,
      {
        body: {
          author_id: validAuthor.author.id,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(authorArticles);
    TestValidator.predicate(
      "author filtering works",
      authorArticles.data.every((a) => a.author.id === validAuthor.author.id),
    );
  }
  // Verify that admin can search with author_username
  const validUsername = allArticles.data.find((a) => a.author?.name);
  if (
    validUsername &&
    validUsername.author?.name &&
    validUsername.author.name.length >= 3
  ) {
    const usernameArticles =
      await api.functional.discussionBoard.articles.index(moderatorConnection, {
        body: {
          author_username: validUsername.author.name.substring(0, 3),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(usernameArticles);
    TestValidator.predicate(
      "username filtering works",
      usernameArticles.data.some((a) =>
        a.author.name.includes(validUsername.author.name.substring(0, 3)),
      ),
    );
  }
  // Verify that admin can use min_trust_score filter
  const validTrust = allArticles.data.find(
    (a) => a.author?.trust_score != null,
  );
  if (
    validTrust &&
    validTrust.author?.trust_score !== undefined &&
    validTrust.author.trust_score !== null
  ) {
    const trustScoreArticles =
      await api.functional.discussionBoard.articles.index(moderatorConnection, {
        body: {
          min_trust_score: Math.max(0, validTrust.author.trust_score - 10),
          max_trust_score: validTrust.author.trust_score + 10,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(trustScoreArticles);
    TestValidator.predicate(
      "trust score filtering works",
      trustScoreArticles.data.every(
        (a) =>
          a.author.trust_score !== undefined &&
          a.author.trust_score !== null &&
          a.author.trust_score >=
            Math.max(0, validTrust.author.trust_score - 10) &&
          a.author.trust_score <= validTrust.author.trust_score + 10,
      ),
    );
  }
  // Verify that admin can use min_article_length filter
  const validContent = allArticles.data.find(
    (a) => a.content && a.content.length > 0,
  );
  if (validContent && validContent.content.length > 0) {
    const lengthArticles = await api.functional.discussionBoard.articles.index(
      moderatorConnection,
      {
        body: {
          min_article_length: Math.max(1, validContent.content.length / 4),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(lengthArticles);
    TestValidator.predicate(
      "article length filtering works",
      lengthArticles.data.every(
        (a) => a.content.length >= Math.max(1, validContent.content.length / 4),
      ),
    );
  }
  // Verify that admin can include comment counts
  const commentCountArticles =
    await api.functional.discussionBoard.articles.index(moderatorConnection, {
      body: {
        include_comment_counts: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(commentCountArticles);
  TestValidator.predicate(
    "comment count present",
    commentCountArticles.data.every(
      (a) => typeof a.comments_count === "number" && a.comments_count >= 0,
    ),
  );
  // Verify that admin can include author info
  const authorInfoArticles =
    await api.functional.discussionBoard.articles.index(moderatorConnection, {
      body: {
        include_author_info: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(authorInfoArticles);
  TestValidator.predicate(
    "author info present",
    authorInfoArticles.data.every((a) => a.author !== undefined),
  );
  // Verify that admin can include category info
  const categoryInfoArticles =
    await api.functional.discussionBoard.articles.index(moderatorConnection, {
      body: {
        include_category_info: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryInfoArticles);
  TestValidator.predicate(
    "category info present",
    categoryInfoArticles.data.every((a) => a.category !== undefined),
  );
  // Verify that admin can search by min_vote_count
  const voteCountArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        min_vote_count: 0,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(voteCountArticles);
  TestValidator.predicate(
    "minimum vote count filtering works",
    voteCountArticles.data.every(
      (a) => typeof a.likes_count === "number" && a.likes_count >= 0,
    ),
  );
  // Verify that admin can use sort_by and sort_order
  const sortedArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortedArticles);
  // Verify sorting is applied correctly
  for (let i = 0; i < sortedArticles.data.length - 1; i++) {
    const current = new Date(sortedArticles.data[i].created_at);
    const next = new Date(sortedArticles.data[i + 1].created_at);
    if (current < next) {
      throw new Error(
        `Descending sort by created_at failed at position ${i}: ${current} < ${next}`,
      );
    }
  }
  // Verify that admin can search by min_update_date
  const validUpdated = allArticles.data.find((a) => a.updated_at);
  if (validUpdated && validUpdated.updated_at) {
    const updateDateArticles =
      await api.functional.discussionBoard.articles.index(moderatorConnection, {
        body: {
          min_update_date: validUpdated.updated_at,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(updateDateArticles);
    TestValidator.predicate(
      "min_update_date filtering works",
      updateDateArticles.data.every(
        (a) => a.updated_at >= validUpdated.updated_at,
      ),
    );
  }
  // Verify that admin can search by max_update_date
  if (validUpdated && validUpdated.updated_at) {
    const maxUpdateDateArticles =
      await api.functional.discussionBoard.articles.index(moderatorConnection, {
        body: {
          max_update_date: validUpdated.updated_at,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(maxUpdateDateArticles);
    TestValidator.predicate(
      "max_update_date filtering works",
      maxUpdateDateArticles.data.every(
        (a) => a.updated_at <= validUpdated.updated_at,
      ),
    );
  }
  // Verify that admin can search with include_attached_files
  const fileArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        include_attached_files: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(fileArticles);
  // Verify that admin can search with include_attached_images
  const imageArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        include_attached_images: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(imageArticles);
  // Verify that admin can use hide_suggested_content
  const suggestedArticles = await api.functional.discussionBoard.articles.index(
    moderatorConnection,
    {
      body: {
        hide_suggested_content: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(suggestedArticles);
}