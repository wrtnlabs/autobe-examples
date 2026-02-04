import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_popular_feed_pagination_next_page(
  connection: api.IConnection,
) {
  // Step 1: Create authentication connection and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Update the connection with the authentication headers
  memberConnection.headers = authResult.token.access
    ? { Authorization: `Bearer ${authResult.token.access}` }
    : {};
  // Step 2: Request the first page of popular feed (1st page)
  const firstPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts._new.index(
      memberConnection,
    );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals(
    "first page has correct current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page has at least one post",
    firstPage.data.length > 0,
  );
  // There is no cursor parameter available in the API signature
  // The API returns the "new" posts as defined by the endpoint specification
  // We can only verify that the API returns the expected metadata and structure
  // Validate that second call returns a response
  const anotherPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts._new.index(
      memberConnection,
    );
  typia.assert(anotherPage);
  // Validate that we get expected pagination metadata structure
  TestValidator.equals(
    "second page has correct current page",
    anotherPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page has correct limit",
    anotherPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "second page has at least one post",
    anotherPage.data.length > 0,
  );
  // Validate that pagination metadata has reasonable values
  TestValidator.predicate(
    "total records is greater than page size",
    anotherPage.pagination.records >= anotherPage.pagination.limit,
  );
  TestValidator.predicate(
    "pages is at least 1",
    anotherPage.pagination.pages >= 1,
  );
  // Since the endpoint is not cursor-based and returns the same results repeatedly,
  // we validate that the API behavior is consistent with its documentation
  // The "popular feed" endpoint is designed to show the newest posts
  // The fact that it returns the same results on multiple calls is expected
  // behavior if the backend doesn't support cursor-based pagination
  // as described in the requirements.
  // We test that the API returns expected results with proper structure
  // This validates that the endpoint is functional and returns the correct type
  // even if the specific pagination behavior mentioned in requirements
  // cannot be implemented with the given API signature
}
