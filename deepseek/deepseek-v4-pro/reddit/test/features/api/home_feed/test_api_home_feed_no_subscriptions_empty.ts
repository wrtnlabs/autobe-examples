import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a newly registered member with no subscriptions receives an empty home feed.
 *
 * Validates that the home feed endpoint gracefully handles the edge case where an
 * authenticated member has not subscribed to any communities. Since the home feed
 * is composed exclusively of posts from subscribed communities, a member with zero
 * subscriptions should receive an empty result set rather than an error response.
 *
 * 1. Register and authenticate as a fresh member using authorize_member_join.
 * 2. Immediately query the home feed endpoint without creating any communities or
 *    subscribing to anything.
 * 3. Assert the response passes typia validation and contains an empty data array.
 * 4. Verify pagination metadata reflects zero records and zero pages.
 */
export async function test_api_home_feed_no_subscriptions_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Query the home feed — should be empty since member has no subscriptions
  const feed = await api.functional.communityHub.feed.home.index(
    memberConnection,
    {
      body: {} satisfies ICommunityHubPost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Validate empty result with correct pagination metadata
  TestValidator.equals("data array is empty", feed.data, []);
  TestValidator.equals("records count is zero", feed.pagination.records, 0);
  TestValidator.equals("pages count is zero", feed.pagination.pages, 0);
}
