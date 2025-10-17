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

export async function test_api_replies_search_by_keyword(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a member to create replies
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashedPassword123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for the parent post
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

  // Step 3: Create a published parent post
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create multiple replies with varied content
  // Create replies containing the search keyword and some without it
  const searchKeyword = "economy";
  const repliesToCreate = ArrayUtil.repeat(5, () => {
    const containsKeyword = Math.random() > 0.5;
    const content = containsKeyword
      ? `${RandomGenerator.paragraph({ sentences: 1 })} ${searchKeyword} ${RandomGenerator.paragraph({ sentences: 1 })}`
      : `${RandomGenerator.paragraph({ sentences: 3 })}`;
    return { content } satisfies IEconomicBoardReply.ICreate;
  });

  // Create replies and collect their IDs for later validation
  const createdReplies: IEconomicBoardReply[] = [];
  for (const replyData of repliesToCreate) {
    const createdReply: IEconomicBoardReply =
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: post.id,
          body: replyData,
        },
      );
    typia.assert(createdReply);
    createdReplies.push(createdReply);
  }

  // Step 5: Perform keyword search on replies to the post
  const searchResponse: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: searchKeyword,
        limit: 10,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(searchResponse);

  // Step 6: Validate that only replies containing the keyword are returned
  TestValidator.equals(
    "search response has correct pagination",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "search result count matches expected",
    searchResponse.data.length > 0,
  );

  // Validate that all returned replies contain the search keyword (case-insensitive)
  searchResponse.data.forEach((reply) => {
    TestValidator.predicate(
      "reply content contains search keyword (case-insensitive)",
      reply.content.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
  });

  // Validate that returned replies are from the created set
  searchResponse.data.forEach((reply) => {
    const found = createdReplies.some((created) => created.id === reply.id);
    TestValidator.predicate("reply in search results was created", found);
  });

  // Verify that replies without the keyword are not returned (by checking against all created replies)
  const repliesWithoutKeyword = createdReplies.filter(
    (reply) =>
      !reply.content.toLowerCase().includes(searchKeyword.toLowerCase()),
  );
  TestValidator.predicate(
    "no replies without keyword were returned",
    repliesWithoutKeyword.every(
      (reply) =>
        !searchResponse.data.some((searched) => searched.id === reply.id),
    ),
  );
}
