import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen-specific connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenData: IDiscussionBoardUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(12)}`,
    referrer: `https://example.com/referrer?source=${RandomGenerator.alphaNumeric(12)}`,
  } satisfies IDiscussionBoardUser.IJoin;
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    { body: citizenData },
  );
  typia.assert(citizen);
  // Step 2: Search for categories using partial name match - we rely on pre-existing data since creation endpoint is not available
  // The requirement states citizens can search by partial name match, so we use common pattern likely to exist: "&"
  const searchQuery = "&";
  const searchResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          name: searchQuery,
          // Limit explicitly to 20 to match requirement, though it's default anyway
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Step 3: Validate search response conforms to requirements
  // Validate that pagination limit of 20 is enforced (as per requirement)
  TestValidator.equals(
    "pagination limit is enforced",
    searchResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "results respect limit",
    searchResponse.data.length <= 20,
  );
  // Validate that only 'active' categories are returned (citizen access rule)
  const onlyActive = searchResponse.data.every(
    (cat) => cat.status === "active",
  );
  TestValidator.predicate("only active categories returned", onlyActive);
  // Validate case-insensitive matching: all results should contain search query
  const hasMatch = searchResponse.data.every((cat) =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  TestValidator.predicate("case-insensitive matching works", hasMatch);
  // Validate that search query appears in the response (at least one category matches)
  TestValidator.predicate(
    "at least one category found",
    searchResponse.data.length > 0,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is at least as many as returned",
    searchResponse.pagination.records >= searchResponse.data.length,
  );
}
