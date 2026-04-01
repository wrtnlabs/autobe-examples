import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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
 * Test that the home feed returns empty results when the authenticated member has no subscriptions.
 *
 * Test Steps:
 * 1. Register a new member account using authorize_member_join utility
 * 2. Do NOT subscribe to any communities (intentionally leave subscription list empty)
 * 3. Request the home feed with default parameters
 * 4. Verify response structure is valid using typia.assert()
 * 5. Verify pagination metadata: current=1, limit=20 (default), records=0, pages=0
 * 6. Verify data array is empty (length === 0)
 * 7. Verify the request succeeds without errors (200 OK)
 *
 * Business Logic Validation:
 * - Home feed must handle empty subscription list gracefully
 * - Response structure must be valid even with no results
 * - Pagination metadata must correctly reflect zero records
 * - No authentication or subscription errors should occur for empty subscription state
 */
export async function test_api_member_feed_home_empty_subscription_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Request home feed without subscribing to any communities
  const feed = await api.functional.redditCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {} satisfies IRedditCommunityPost.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(feed);
  // 4. Verify pagination metadata for empty results
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.equals("limit", feed.pagination.limit, 20);
  TestValidator.equals("total records", feed.pagination.records, 0);
  TestValidator.equals("total pages", feed.pagination.pages, 0);
  // 5. Verify data array is empty
  TestValidator.equals("data array length", feed.data.length, 0);
}
