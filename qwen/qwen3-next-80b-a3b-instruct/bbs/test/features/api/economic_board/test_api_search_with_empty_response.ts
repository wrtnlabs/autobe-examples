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

export async function test_api_search_with_empty_response(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member to create context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for organizing posts
  const topicName = "Inflation" as const;
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Search for posts with a unique search term that won't match any posts
  const uniqueSearchTerm =
    "non_existent_post_search_term_" +
    typia.random<string & tags.Format<"uuid">>();
  const searchResponse: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        search: uniqueSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(searchResponse);

  // Step 4: Validate response structure for empty results
  // Verify data array is empty
  TestValidator.equals("empty data array", searchResponse.data.length, 0);

  // Verify pagination structure is valid and properly initialized
  const pagination = searchResponse.pagination;
  TestValidator.equals("pagination current page is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 10", pagination.limit, 10);
  TestValidator.equals(
    "pagination records is 0 for empty results",
    pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 when records=0",
    pagination.pages,
    0,
  );

  // Verify search response schema matches IPageIEconomicBoardPost
  typia.assert<IPageIEconomicBoardPost>(searchResponse);

  // Verify no HTTP errors occurred
  // (This is implied when no error is thrown and typia.assert succeeds)
}
