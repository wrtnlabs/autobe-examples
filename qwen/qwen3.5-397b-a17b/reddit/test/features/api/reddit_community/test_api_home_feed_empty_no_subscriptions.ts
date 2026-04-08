import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the home feed behavior when a member has no community subscriptions.
 *
 * Validates that the home feed endpoint returns an empty result set when an authenticated member has not subscribed to any communities. This test ensures the feed correctly handles the edge case of zero subscriptions without throwing errors or returning unexpected data.
 *
 * The test verifies that pagination metadata accurately reflects the empty state with records=0 and pages=0, while maintaining valid pagination structure with current=1 and the default limit value.
 *
 * 1. Register a new member account with randomized credentials using authorize_member_join utility.
 * 2. Create member-specific connection with authentication token from join response.
 * 3. Call home feed endpoint with default request parameters (no filters, default sorting).
 * 4. Validate response structure using typia.assert().
 * 5. Verify data array is empty (length === 0).
 * 6. Verify pagination metadata: current=1, records=0, pages=0.
 */
export async function test_api_home_feed_empty_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve home feed with no subscriptions
  const feed = await api.functional.redditCommunity.member.feed.home.index(
    memberConnection,
    {
      body: {} satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Validate empty data array
  TestValidator.equals("data array length", feed.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.equals("total records", feed.pagination.records, 0);
  TestValidator.equals("total pages", feed.pagination.pages, 0);
  TestValidator.predicate("limit is positive", feed.pagination.limit > 0);
}
