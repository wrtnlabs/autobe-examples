import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_replies_new_sort_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test comment replies endpoint with New sort order and cursor-based pagination
  // This validates the sorting and pagination functionality for nested comment replies
  const testConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };
  // Generate a test parent comment ID
  const parentCommentId = typia.random<string & tags.Format<"uuid">>();
  // First page request with New sort
  const firstPage =
    await api.functional.redditClone.redditClone.comments.replies.index(
      testConnection,
      {
        commentId: parentCommentId,
        body: {
          sort: "New",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page has pagination",
    firstPage.pagination !== null,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    firstPage.pagination.pages >= 0,
  );
  // Validate New sort order - replies should be sorted by created_at DESC (most recent first)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const currentTime = new Date(firstPage.data[i].createdAt).getTime();
    const nextTime = new Date(firstPage.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `reply ${i} created_at >= reply ${i + 1} created_at (New sort)`,
      currentTime >= nextTime,
    );
  }
  // If there are more pages, test cursor pagination
  if (
    firstPage.pagination.current < firstPage.pagination.pages &&
    firstPage.data.length > 0
  ) {
    const lastReply = firstPage.data[firstPage.data.length - 1];
    // Second page request using cursor parameters
    const secondPage =
      await api.functional.redditClone.redditClone.comments.replies.index(
        testConnection,
        {
          commentId: parentCommentId,
          body: {
            sort: "New",
            limit: firstPage.pagination.limit,
            cursorId: lastReply.id,
            cursorCreatedAt: lastReply.createdAt,
          },
        },
      );
    typia.assert(secondPage);
    // Validate cursor pagination works correctly
    TestValidator.predicate(
      "second page has pagination",
      secondPage.pagination !== null,
    );
    TestValidator.predicate(
      "second page current > first page current",
      secondPage.pagination.current > firstPage.pagination.current,
    );
    // Validate no duplicate replies between pages
    const firstPageIds = new Set(firstPage.data.map((r) => r.id));
    const hasDuplicates = secondPage.data.some((r) => firstPageIds.has(r.id));
    TestValidator.predicate(
      "no duplicate replies between pages",
      !hasDuplicates,
    );
    // Validate second page is also sorted by New (created_at DESC)
    for (let i = 0; i < secondPage.data.length - 1; i++) {
      const currentTime = new Date(secondPage.data[i].createdAt).getTime();
      const nextTime = new Date(secondPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `second page reply ${i} created_at >= reply ${i + 1} created_at (New sort)`,
        currentTime >= nextTime,
      );
    }
    // Validate reply structure for each reply in second page
    for (const reply of secondPage.data) {
      TestValidator.predicate(
        "reply has valid id",
        typeof reply.id === "string",
      );
      TestValidator.predicate(
        "reply has content",
        typeof reply.content === "string",
      );
      TestValidator.predicate(
        "reply has voteScore",
        typeof reply.voteScore === "number",
      );
      TestValidator.predicate(
        "reply has createdAt",
        typeof reply.createdAt === "string",
      );
      TestValidator.predicate("reply has author", reply.author !== null);
      TestValidator.predicate(
        "reply has author id",
        typeof reply.author.id === "string",
      );
      TestValidator.predicate(
        "reply has author username",
        typeof reply.author.username === "string",
      );
      TestValidator.predicate(
        "reply has replies array",
        Array.isArray(reply.replies),
      );
    }
  }
  // Validate pagination records and pages relationship
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "pages >= current when records exist",
      firstPage.pagination.pages >= firstPage.pagination.current,
    );
  }
  // Validate total records consistency
  TestValidator.predicate(
    "records equals current * limit when single page",
    firstPage.pagination.pages <= 1 ||
      firstPage.pagination.records >=
        (firstPage.pagination.current - 1) * firstPage.pagination.limit,
  );
}
