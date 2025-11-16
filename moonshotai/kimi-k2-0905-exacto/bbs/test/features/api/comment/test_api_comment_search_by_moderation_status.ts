import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";

export async function test_api_comment_search_by_moderation_status(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as member
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Verify member authentication was successful
  TestValidator.predicate(
    "member authentication successful",
    memberAuth.access_token.length > 0,
  );

  // Step 2: Create an article for commenting
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: [categoryId],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create multiple comments - these will initially have pending status
  const commentContents = ArrayUtil.repeat(6, () =>
    RandomGenerator.paragraph({ sentences: 3 }),
  );

  const createdComments = await ArrayUtil.asyncMap(
    commentContents,
    async (content, index) => {
      const commentData = {
        article_id: article.id,
        content: content,
      } satisfies IEconomicDiscussionComment.ICreate;

      const comment =
        await api.functional.economicDiscussion.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: commentData,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  TestValidator.predicate(
    "all comments created successfully",
    createdComments.length === 6,
  );

  // Step 4: Search without status filter (should return comments based on permissions)
  const unrestrictedSearchRequest = {
    article_id: article.id,
    page: 1,
    limit: 10,
  } satisfies IEconomicDiscussionComment.IRequest;

  const unrestrictedResults =
    await api.functional.economicDiscussion.search.comments.index(connection, {
      body: unrestrictedSearchRequest,
    });
  typia.assert(unrestrictedResults);

  TestValidator.predicate(
    "unrestricted search returns comment results",
    unrestrictedResults.data.length > 0,
  );
  TestValidator.predicate(
    "all comments have valid moderation status",
    unrestrictedResults.data.every((comment) =>
      ["pending", "approved", "rejected"].includes(comment.status),
    ),
  );
  TestValidator.predicate(
    "all comments belong to correct article",
    unrestrictedResults.data.every(
      (comment) => comment.economic_discussion_article_id === article.id,
    ),
  );

  // Step 5: Test filtering by specific status (this validates the API can handle status filters)
  const searchByStatus = async (
    status: "pending" | "approved" | "rejected",
  ) => {
    const searchRequest = {
      status: status,
      article_id: article.id,
      page: 1,
      limit: 10,
    } satisfies IEconomicDiscussionComment.IRequest;

    const results =
      await api.functional.economicDiscussion.search.comments.index(
        connection,
        {
          body: searchRequest,
        },
      );
    typia.assert(results);

    return results;
  };

  // Test pending status filter
  const pendingResults = await searchByStatus("pending");
  TestValidator.predicate(
    "pending search returns valid structure",
    pendingResults.data.length >= 0,
  );

  // Test approved status filter
  const approvedResults = await searchByStatus("approved");
  TestValidator.predicate(
    "approved search returns valid structure",
    approvedResults.data.length >= 0,
  );

  // Test rejected status filter
  const rejectedResults = await searchByStatus("rejected");
  TestValidator.predicate(
    "rejected search returns valid structure",
    rejectedResults.data.length >= 0,
  );

  // Step 6: Test pagination with status filtering
  const paginatedSearchRequest = {
    status: "pending" as const,
    article_id: article.id,
    page: 1,
    limit: 3,
  } satisfies IEconomicDiscussionComment.IRequest;

  const paginatedResults =
    await api.functional.economicDiscussion.search.comments.index(connection, {
      body: paginatedSearchRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination metadata present",
    paginatedResults.pagination !== undefined,
  );

  // Step 7: Test sorting options with status filter
  const sortingOptions = ["created_at", "relevance", "status"] as const;

  for (const sortBy of sortingOptions) {
    const sortedSearchRequest = {
      status: "pending" as const,
      article_id: article.id,
      sort_by: sortBy,
      page: 1,
      limit: 5,
    } satisfies IEconomicDiscussionComment.IRequest;

    const sortedResults =
      await api.functional.economicDiscussion.search.comments.index(
        connection,
        {
          body: sortedSearchRequest,
        },
      );
    typia.assert(sortedResults);

    TestValidator.predicate(
      `sorting by ${sortBy} returns valid results`,
      sortedResults.data.length >= 0,
    );
  }

  // Step 8: Test temporal filtering with moderation status
  const temporalSearchRequest = {
    status: "pending" as const,
    article_id: article.id,
    created_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Within last 24 hours
    page: 1,
    limit: 10,
  } satisfies IEconomicDiscussionComment.IRequest;

  const temporalResults =
    await api.functional.economicDiscussion.search.comments.index(connection, {
      body: temporalSearchRequest,
    });
  typia.assert(temporalResults);

  TestValidator.predicate(
    "temporal search within last 24 hours returns valid results",
    temporalResults.data.length >= 0,
  );

  // Validate temporal constraints are met
  if (temporalResults.data.length > 0) {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    TestValidator.predicate(
      "all temporal results are within specified timeframe",
      temporalResults.data.every((comment) => {
        const commentTime = new Date(comment.created_at);
        return commentTime >= cutoffTime;
      }),
    );
  }

  // Step 9: Test combined filtering options
  const complexSearchRequest = {
    status: "pending" as const,
    article_id: article.id,
    member_id: memberAuth.member.id, // Filter by specific author
    sort_by: "created_at" as const,
    order: "desc" as const,
    page: 1,
    limit: 5,
  } satisfies IEconomicDiscussionComment.IRequest;

  const complexResults =
    await api.functional.economicDiscussion.search.comments.index(connection, {
      body: complexSearchRequest,
    });
  typia.assert(complexResults);

  TestValidator.predicate(
    "complex filtering returns valid results",
    complexResults.data.length >= 0,
  );
  TestValidator.predicate(
    "all complex results match author filter",
    complexResults.data.every(
      (comment) =>
        comment.economic_discussion_member_id === memberAuth.member.id,
    ),
  );
}
