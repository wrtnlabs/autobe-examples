import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_posts_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to create test posts
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create multiple topics for diverse post categorization
  const topics: IEconomicBoardTopic[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const topicName:
        | "Inflation"
        | "Tax Policy"
        | "Elections"
        | "Global Trade"
        | "Monetary Policy"
        | "Labor Markets"
        | "Fiscal Policy" = RandomGenerator.pick([
        "Inflation",
        "Tax Policy",
        "Elections",
        "Global Trade",
        "Monetary Policy",
        "Labor Markets",
        "Fiscal Policy",
      ] as const);
      const topic: IEconomicBoardTopic =
        await api.functional.economicBoard.admin.topics.create(connection, {
          body: {
            name: topicName,
          } satisfies IEconomicBoardTopic.ICreate,
        });
      typia.assert(topic);
      return topic;
    },
  );

  // 3. Create multiple published posts for pagination testing
  const createdPosts: IEconomicBoardPost[] = await ArrayUtil.asyncRepeat(
    25, // Create enough posts to test pagination (more than default 20)
    async () => {
      const selectedTopic = RandomGenerator.pick(topics) as IEconomicBoardTopic;
      const post: IEconomicBoardPost =
        await api.functional.economicBoard.member.posts.create(connection, {
          body: {
            economic_board_topics_id: selectedTopic.id,
            subject: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 8,
            }),
            content: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 10,
              sentenceMax: 20,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IEconomicBoardPost.ICreate,
        });
      typia.assert(post);
      // Ensure post is published - backend auto-sets to 'published' status after creation
      return post;
    },
  );

  // 4. Verify pagination with custom page size and offset
  // Test first page with limit=10
  const firstPage: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(firstPage);

  TestValidator.equals("first page has 10 posts", firstPage.data.length, 10);
  TestValidator.equals(
    "first page page number is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total posts count should be >= 25",
    firstPage.pagination.records >= 25,
  );
  TestValidator.predicate(
    "total pages should be at least 3",
    firstPage.pagination.pages >= 3,
  );

  // Verify all posts on first page are published
  TestValidator.predicate(
    "all posts on first page should have published status",
    firstPage.data.every((post) => post.status === "published"),
  );

  // Test second page with limit=10
  const secondPage: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals("second page has 10 posts", secondPage.data.length, 10);
  TestValidator.equals(
    "second page page number is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 10",
    secondPage.pagination.limit,
    10,
  );

  // Test that first and second page have no overlapping posts
  const firstPageIds = firstPage.data.map((post) => post.id);
  const secondPageIds = secondPage.data.map((post) => post.id);
  TestValidator.predicate(
    "first and second pages have no overlapping posts",
    firstPageIds.every((id) => !secondPageIds.includes(id)),
  );

  // Test ordering by created_at descending (newest first)
  const sortedPostByCreatedAt = [...createdPosts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const postsOnFirstPageSorted = [...firstPage.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals(
    "first page should be ordered by created_at descending (most recent first)",
    firstPage.data[0].id,
    sortedPostByCreatedAt[0].id,
  );

  // Test page limit maximum (100 is the maximum)
  const maxPage: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(maxPage);
  TestValidator.equals(
    "maximum page limit accepted",
    maxPage.pagination.limit,
    100,
  );

  // Test that only published posts are returned when no status filter is given
  // (This is the default behavior, and we've already verified it above)
}
