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

export async function test_api_search_replies_for_post_with_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate member to create post and replies
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the parent post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create the parent post
  const parentPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Economic Outlook for 2024",
        content:
          "The current economic indicators suggest a mixed outlook with inflation concerns persisting despite recent policy adjustments.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(parentPost);
  TestValidator.equals(
    "post status should be pending",
    parentPost.status,
    "pending",
  );

  // 4. Create multiple replies for pagination testing
  const replyCount = 15;
  const replies: IEconomicBoardReply[] = [];

  // Create replies with random content
  for (let i = 0; i < replyCount; i++) {
    const reply: IEconomicBoardReply =
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: parentPost.id,
          body: {
            content: `Reply #${i + 1} to the post about inflation.`,
          } satisfies IEconomicBoardReply.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // 5. Validate pagination with page 1, limit 10
  const page1Results: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: parentPost.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(page1Results);

  TestValidator.equals(
    "page 1 should have 10 replies",
    page1Results.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 pagination current should be 1",
    page1Results.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit should be 10",
    page1Results.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 pagination records should be 15 (total replies)",
    page1Results.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 pagination pages should be 2 (15/10 ceiling)",
    page1Results.pagination.pages,
    2,
  );

  // Validate that all replies in page 1 belong to the correct parent post
  for (const reply of page1Results.data) {
    TestValidator.equals(
      "reply belongs to correct parent post",
      reply.economic_board_post_id,
      parentPost.id,
    );
  }

  // 6. Validate pagination with page 2, limit 10
  const page2Results: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: parentPost.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(page2Results);

  TestValidator.equals(
    "page 2 should have 5 replies",
    page2Results.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 pagination current should be 2",
    page2Results.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit should be 10",
    page2Results.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 pagination records should be 15 (total replies)",
    page2Results.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 2 pagination pages should be 2 (15/10 ceiling)",
    page2Results.pagination.pages,
    2,
  );

  // Validate that all replies in page 2 belong to the correct parent post
  for (const reply of page2Results.data) {
    TestValidator.equals(
      "reply belongs to correct parent post",
      reply.economic_board_post_id,
      parentPost.id,
    );
  }

  // 7. Validate default sort order (created_at ascending)
  // Page 1 should have the 10 oldest replies
  // Page 2 should have the 5 newest replies
  // We can verify this by checking that replies in page 2 have later timestamps than page 1
  const page1FirstReply = page1Results.data[0];
  const page1LastReply = page1Results.data[9];
  const page2FirstReply = page2Results.data[0];
  const page2LastReply = page2Results.data[4];

  TestValidator.predicate(
    "page 1 first reply is older than page 1 last reply",
    new Date(page1FirstReply.created_at) < new Date(page1LastReply.created_at),
  );
  TestValidator.predicate(
    "page 1 last reply is older than page 2 first reply",
    new Date(page1LastReply.created_at) < new Date(page2FirstReply.created_at),
  );
  TestValidator.predicate(
    "page 2 first reply is older than page 2 last reply",
    new Date(page2FirstReply.created_at) < new Date(page2LastReply.created_at),
  );
}
