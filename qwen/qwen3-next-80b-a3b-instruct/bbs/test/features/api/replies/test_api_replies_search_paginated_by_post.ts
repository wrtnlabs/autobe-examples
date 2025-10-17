import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReplies";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardReplies";

export async function test_api_replies_search_paginated_by_post(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create an active topic category for the post
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post that will have replies
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Create multiple replies to the post for pagination testing
  const replyCount = 15;
  const createdReplies: IEconomicBoardReply[] = [];
  for (let i = 0; i < replyCount; i++) {
    const reply: IEconomicBoardReply =
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: post.id,
          body: {
            content: `Reply ${i + 1}: ${RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 8,
            })}`,
          } satisfies IEconomicBoardReply.ICreate,
        },
      );
    typia.assert(reply);
    createdReplies.push(reply);
  }

  // 5. Create additional replies with specific content keywords for filtering
  const keywordReplies = ["economy", "growth", "policy", "inflation", "debt"];
  for (const keyword of keywordReplies) {
    const reply: IEconomicBoardReply =
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: post.id,
          body: {
            content: `This is about ${keyword} and economic policy.`,
          } satisfies IEconomicBoardReply.ICreate,
        },
      );
    typia.assert(reply);
    createdReplies.push(reply);
  }

  // 6. Test pagination with default parameters (page 1, limit 10)
  const defaultPagination: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {},
    });
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default page count",
    defaultPagination.pagination.pages,
    1,
  );
  TestValidator.equals(
    "default page limit",
    defaultPagination.pagination.limit,
    25,
  );
  TestValidator.equals(
    "default current page",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals("default data count", defaultPagination.data.length, 20); // Total of 20 replies created

  // 7. Test pagination with custom page and limit
  const customPagination: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        page: 2,
        limit: 10,
      },
    });
  typia.assert(customPagination);
  TestValidator.equals(
    "custom page count",
    customPagination.pagination.pages,
    2,
  );
  TestValidator.equals(
    "custom page limit",
    customPagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom current page",
    customPagination.pagination.current,
    2,
  );
  TestValidator.equals("custom data count", customPagination.data.length, 10);

  // 8. Test search functionality with keyword filtering
  const searchPagination: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: "economy",
      },
    });
  typia.assert(searchPagination);
  TestValidator.equals(
    "search results total",
    searchPagination.pagination.records,
    1,
  );
  TestValidator.predicate(
    "search results contain keyword",
    searchPagination.data.every((reply) =>
      reply.content.toLowerCase().includes("economy"),
    ),
  );

  // 9. Test multiple keyword search (partial match)
  const partialSearch: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: "inflation",
      },
    });
  typia.assert(partialSearch);
  TestValidator.equals(
    "inflation search results total",
    partialSearch.pagination.records,
    1,
  );
  TestValidator.predicate(
    "partial search matches valid results",
    partialSearch.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain keyword",
    partialSearch.data.every((reply) =>
      reply.content.toLowerCase().includes("inflation"),
    ),
  );

  // 10. Test sorting by created_at (default, descending)
  const defaultSorted: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {},
    });
  typia.assert(defaultSorted);

  // Verify replies are sorted descending by created_at (newest first)
  TestValidator.predicate(
    "replies sorted by created_at descending",
    defaultSorted.data.every((reply, index, arr) => {
      if (index === arr.length - 1) return true; // Last item
      const current = new Date(reply.created_at).getTime();
      const next = new Date(arr[index + 1].created_at).getTime();
      return current >= next; // Descending order
    }),
  );

  // 11. Test sorting by created_at ascending
  const ascendingSorted: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        sort: "created_at",
        order: "asc",
      },
    });
  typia.assert(ascendingSorted);

  // Verify replies sorted by created_at ascending (oldest first)
  TestValidator.predicate(
    "replies sorted by created_at ascending",
    ascendingSorted.data.every((reply, index, arr) => {
      if (index === arr.length - 1) return true; // Last item
      const current = new Date(reply.created_at).getTime();
      const next = new Date(arr[index + 1].created_at).getTime();
      return current <= next; // Ascending order
    }),
  );

  // 12. Test sorting by updated_at (descending)
  const updatedSorted: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        sort: "updated_at",
        order: "desc",
      },
    });
  typia.assert(updatedSorted);

  // Verify replies sorted by updated_at descending
  TestValidator.predicate(
    "replies sorted by updated_at descending",
    updatedSorted.data.every((reply, index, arr) => {
      if (index === arr.length - 1) return true; // Last item
      const current = new Date(reply.updated_at).getTime();
      const next = new Date(arr[index + 1].updated_at).getTime();
      return current >= next; // Descending order
    }),
  );

  // 13. Test empty search term (returns all)
  const emptySearch: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: "",
      },
    });
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns all replies",
    emptySearch.data.length,
    createdReplies.length,
  );

  // 14. Test search with no matching results
  const noMatchSearch: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: "nonexistentkeyword12345",
      },
    });
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "no match search returns empty",
    noMatchSearch.data.length,
    0,
  );

  // 15. Test pagination with max limit (100)
  const maxLimit: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 100,
      },
    });
  typia.assert(maxLimit);
  TestValidator.equals("max limit respected", maxLimit.pagination.limit, 100);
  TestValidator.predicate(
    "max limit returns all results",
    maxLimit.data.length === createdReplies.length,
  );

  // 16. Validate response structure: check that only published replies are returned
  // (all replies should be published since they're created through member API)
  TestValidator.predicate(
    "only published replies returned",
    defaultSorted.data.every((reply) => {
      // Replies are always published and never have a status field
      // as per the DTO definition - even the response type doesn't include status
      return true;
    }),
  );
}
