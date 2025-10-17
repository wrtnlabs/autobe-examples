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

export async function test_api_replies_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for the post
  const topicName:
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy" = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Topic for testing reply pagination",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a published post that will receive replies
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Economic analysis on inflation trends",
        content:
          "This post discusses recent inflation trends and their economic implications.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create multiple replies for pagination testing (10 total)
  const replyCount = 10;
  const replies: IEconomicBoardReply[] = [];
  for (let i = 0; i < replyCount; i++) {
    const reply: IEconomicBoardReply =
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: post.id,
          body: {
            content: `Reply ${i + 1}: This is a sample reply content for pagination testing.`,
          } satisfies IEconomicBoardReply.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Step 5: Test pagination with limit=3, page=1 (first page)
  const firstPage: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 3,
        page: 1,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 3);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    replyCount,
  );
  TestValidator.equals("first page pages", firstPage.pagination.pages, 4); // ceiling(10/3) = 4
  TestValidator.equals("first page replies count", firstPage.data.length, 3);
  TestValidator.equals(
    "first page first reply content",
    firstPage.data[0].content,
    replies[9].content,
  ); // Newest first
  TestValidator.equals(
    "first page last reply content",
    firstPage.data[2].content,
    replies[7].content,
  );

  // Step 6: Test pagination with limit=3, page=2 (second page)
  const secondPage: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 3,
        page: 2,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(secondPage);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 3);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    replyCount,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 4);
  TestValidator.equals("second page replies count", secondPage.data.length, 3);
  TestValidator.equals(
    "second page first reply content",
    secondPage.data[0].content,
    replies[6].content,
  );
  TestValidator.equals(
    "second page last reply content",
    secondPage.data[2].content,
    replies[4].content,
  );

  // Step 7: Test pagination with limit=3, page=4 (last page, should have 1 reply)
  const lastPage: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 3,
        page: 4,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(lastPage);
  TestValidator.equals("last page limit", lastPage.pagination.limit, 3);
  TestValidator.equals("last page current", lastPage.pagination.current, 4);
  TestValidator.equals(
    "last page records",
    lastPage.pagination.records,
    replyCount,
  );
  TestValidator.equals("last page pages", lastPage.pagination.pages, 4);
  TestValidator.equals("last page replies count", lastPage.data.length, 1);
  TestValidator.equals(
    "last page reply content",
    lastPage.data[0].content,
    replies[0].content,
  );

  // Step 8: Test pagination with limit=10, page=1 (single page)
  const singlePage: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 10,
        page: 1,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(singlePage);
  TestValidator.equals("single page limit", singlePage.pagination.limit, 10);
  TestValidator.equals("single page current", singlePage.pagination.current, 1);
  TestValidator.equals(
    "single page records",
    singlePage.pagination.records,
    replyCount,
  );
  TestValidator.equals("single page pages", singlePage.pagination.pages, 1);
  TestValidator.equals("single page replies count", singlePage.data.length, 10);

  // Step 9: Test no search
  const noSearch: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: "nonexistent keyword",
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(noSearch);
  TestValidator.equals("no search count", noSearch.data.length, 0);

  // Step 10: Test replies from different post are not included
  const anotherTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Tax Policy",
        description: "Topic for another post",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  const anotherPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: anotherTopic.id,
        subject: "Another post for comparison",
        content: "This post should not have any replies from the target post.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(anotherPost);

  // Ensure this post has one reply so we know it exists
  await api.functional.economicBoard.member.posts.replies.create(connection, {
    postId: anotherPost.id,
    body: {
      content: "Independent reply",
    } satisfies IEconomicBoardReply.ICreate,
  });

  // Query first post's replies - should NOT include the reply from another post
  const verificationPage: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 10,
        page: 1,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(verificationPage);
  TestValidator.equals(
    "verification replies count",
    verificationPage.data.length,
    10,
  );
  // Since replies are sorted by created_at (newest first), the first reply should be the last one created
  TestValidator.equals(
    "verification first reply content",
    verificationPage.data[0].content,
    replies[9].content,
  );
  // Verify no reply from anotherPost is present (we only created 10 replies for the target post)
}
