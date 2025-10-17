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

export async function test_api_search_replies_for_post_with_keyword_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for the parent post
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a parent post under the topic
  const parentPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Impact of Inflation on Household Budgets",
        content:
          "Recent inflation trends have significantly impacted household purchasing power. Many families are adjusting their spending habits to cope with rising costs.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(parentPost);

  // Step 4: Create multiple replies to the post with varying content
  const keyword = "inflation"; // Target keyword for search
  const replyContents = [
    "This is a reply about economic inflation and its impact.",
    "This is a reply about inflation rates and their effects.",
    "This is a reply about rising inflation and its consequences.",
    "This is a reply about unrelated economic topics like taxation or trade.",
    "This is a reply about trade policies and tariffs, not inflation",
  ];

  // Create all replies concurrently
  await ArrayUtil.asyncForEach(replyContents, async (content) => {
    const reply: IEconomicBoardReply =
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: parentPost.id,
          body: {
            content,
          } satisfies IEconomicBoardReply.ICreate,
        },
      );
    typia.assert(reply);
  });

  // Step 5: Search replies using the target keyword
  const searchResult: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: parentPost.id,
      body: {
        search: keyword,
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate response structure and pagination
  TestValidator.equals(
    "page number should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "at least one result should be found",
    () => searchResult.data.length > 0,
  );

  // Step 7: Verify that replies without the keyword are excluded from results
  // Business logic validation: ALL returned replies MUST contain the keyword
  const keywordResults = searchResult.data;

  // Verify each returned reply's content contains the keyword (case-insensitive)
  // This is business logic validation, NOT type validation, so it's allowed
  keywordResults.forEach((reply) => {
    TestValidator.predicate("reply content should contain keyword", () =>
      reply.content.toLowerCase().includes(keyword.toLowerCase()),
    );
  });
}
