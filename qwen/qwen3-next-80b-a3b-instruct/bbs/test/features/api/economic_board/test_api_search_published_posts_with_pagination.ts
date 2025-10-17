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

export async function test_api_search_published_posts_with_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to create test posts
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for post categorization
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
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create 15 pending posts to ensure pagination testing
  const postCount = 15;
  const posts = await ArrayUtil.asyncRepeat(postCount, async (index) => {
    const subject = RandomGenerator.paragraph({ sentences: 2 });
    const content = RandomGenerator.content({ paragraphs: 2 });

    const post: IEconomicBoardPost =
      await api.functional.economicBoard.member.posts.create(connection, {
        body: {
          economic_board_topics_id: topic.id,
          subject,
          content,
        } satisfies IEconomicBoardPost.ICreate,
      });
    typia.assert(post);

    // Validate that the post is created with "pending" status initially
    TestValidator.equals(
      "post status should be pending",
      post.status,
      "pending",
    );

    return post;
  });

  // 4. Search for pending posts with pagination (page 1, limit 10)
  const searchRequest: IEconomicBoardPost.IRequest = {
    page: 1,
    limit: 10,
    status: "pending",
  } satisfies IEconomicBoardPost.IRequest;

  const response: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: searchRequest,
    });
  typia.assert(response);

  // 5. Validate response data
  TestValidator.equals(
    "page count should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("page size should be 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "total posts should be exactly 15",
    () => response.pagination.records === 15,
  );
  TestValidator.equals("total pages should be 2", response.pagination.pages, 2);
  TestValidator.equals(
    "response should contain 10 posts",
    response.data.length,
    10,
  );

  // 6. Verify all returned posts are pending (the only status we can create)
  const allPending = response.data.every((post) => post.status === "pending");
  TestValidator.predicate(
    "all returned posts should be pending",
    () => allPending,
  );

  // 7. Validate that each returned post has required fields
  response.data.forEach((post) => {
    TestValidator.predicate(
      "post should have id",
      () => typeof post.id === "string" && post.id.length > 0,
    );
    TestValidator.predicate(
      "post should have topic id",
      () =>
        typeof post.economic_board_topics_id === "string" &&
        post.economic_board_topics_id.length > 0,
    );
    TestValidator.predicate(
      "post should have subject",
      () => typeof post.subject === "string" && post.subject.length >= 5,
    );
    TestValidator.predicate(
      "post should have content",
      () => typeof post.content === "string" && post.content.length >= 10,
    );
    TestValidator.predicate(
      "post should have created_at",
      () =>
        typeof post.created_at === "string" && post.created_at.endsWith("Z"),
    );
    TestValidator.predicate(
      "post should have updated_at",
      () =>
        typeof post.updated_at === "string" && post.updated_at.endsWith("Z"),
    );
    TestValidator.predicate(
      "post should have status pending",
      () => post.status === "pending",
    );
    TestValidator.predicate(
      "post should have reply_count >= 0",
      () => typeof post.reply_count === "number" && post.reply_count >= 0,
    );
  });

  // 8. Test second page
  const searchRequestPage2: IEconomicBoardPost.IRequest = {
    page: 2,
    limit: 10,
    status: "pending",
  } satisfies IEconomicBoardPost.IRequest;

  const responsePage2: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: searchRequestPage2,
    });
  typia.assert(responsePage2);

  TestValidator.equals(
    "page count should be 2",
    responsePage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page size should be 10",
    responsePage2.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages should be 2",
    responsePage2.pagination.pages,
    2,
  );
  TestValidator.predicate(
    "second page should have exactly 5 posts",
    () => responsePage2.data.length === 5,
  );

  // Verify all posts on second page are pending
  const allPendingPage2 = responsePage2.data.every(
    (post) => post.status === "pending",
  );
  TestValidator.predicate(
    "all posts on second page should be pending",
    () => allPendingPage2,
  );
}
