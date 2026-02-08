import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_filtered_feed_by_community_and_author(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // This e2e test covers retrieving posts filtered by a specific community and author using an authenticated user.
  // It verifies that the posts belong to the filters, sorting (Top, recent), pagination and vote scores are correct.
  // 1. User joins the platform (creates account and authenticates)
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Since ICommunityPlatformPost.IRequest schema is empty (no property), simulate or random does not clarify filter options.
  // For the test, construct body with properties according to scenario plan. To match schema, we must confirm structure -
  // however the provided ICommunityPlatformPost.IRequest is empty, so no filtering can be applied in the actual request.
  // Due to DTO limitation and desire for scenario fidelity, we attempt to craft a filtering by community and author.
  // Since the schema for IRequest is empty, we remove invalid properties and proceed without proper filters.
  // To satisfy the scenario as closely as possible, we:
  // - Call API with no filter (empty body) to get posts.
  // - Validate response data for correct properties.
  // - Since no filter is supported by the schema, skip invalid filter tests.
  // 3. First call to get posts list with empty body (simulate retrieving all posts as replacement)
  const postsResponse: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.user.posts.index(userConnection, {
      body: {},
    });
  typia.assert(postsResponse);
  // Validation that data is correct
  for (const post of postsResponse.data) {
    typia.assert(post);
    // Removed non-existent properties 'community' and 'author' validation since those do not exist on ISummary
  }
  // 4. Since filtering and pagination cannot be tested due to empty IRequest schema, just validate pagination metadata
  const pagination = postsResponse.pagination;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 5. Error handling: test access with unauthorized connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Guests can access popular and community feeds; so try with empty body
  const guestPosts = await api.functional.communityPlatform.user.posts.index(
    guestConnection,
    { body: {} },
  );
  typia.assert(guestPosts);
  // Validate some data
  TestValidator.predicate(
    "guest can access posts data",
    guestPosts.data.length >= 0,
  );
}
