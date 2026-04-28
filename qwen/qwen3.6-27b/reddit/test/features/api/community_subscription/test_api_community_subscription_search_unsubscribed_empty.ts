import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test searching community subscriptions returns empty results for non-subscribed communities.
 *
 * Authenticates a member account and searches for community subscriptions filtered by a community_id the member has never joined. Validates that the paginated response contains an empty data array and zero total records, confirming the search endpoint correctly filters against the database without exposing information about non-existent entities.
 *
 * This edge case ensures the system gracefully handles queries for subscriptions that do not exist, returning an empty result set rather than an error.
 *
 * 1. Authenticate a new member via join endpoint.
 * 2. Generate a random UUID representing a non-subscribed community.
 * 3. Search community subscriptions filtered by that communityId.
 * 4. Validate the response contains an empty data array with pagination showing zero records.
 */
export async function test_api_community_subscription_search_unsubscribed_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuthorized);
  // 2. Generate a random communityId the member has not subscribed to
  const unsubscribedCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Search community subscriptions filtered by the non-subscribed communityId
  const searchBody = {
    communityId: unsubscribedCommunityId,
  } satisfies IRedditLikeCommunityCommunitySubscription.IRequest;
  const searchResult =
    await api.functional.redditLikeCommunity.member.community_subscriptions.index(
      memberConnection,
      { body: searchBody },
    );
  typia.assert(searchResult);
  // 4. Validate empty results: data array is empty and pagination records is 0
  TestValidator.equals("data array is empty", searchResult.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    searchResult.pagination.records,
    0,
  );
}
