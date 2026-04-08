import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the home feed behavior when a member has no subscribed communities.
 *
 * Validates that the home feed correctly returns an empty result set when an authenticated member has not subscribed to any communities. This edge case ensures the feed system gracefully handles users who have registered but not yet engaged with any communities. The test also verifies that the response structure remains valid with proper pagination metadata even when no data is present.
 *
 * Special attention is given to verifying that:
 * - The API returns a valid response structure with pagination and data fields
 * - The data array is empty (length 0)
 * - Pagination metadata correctly shows 0 records and 0 pages
 * - No error is thrown - empty feed is expected behavior for unsubscribed users
 *
 * 1. Authenticate a new member account without any community subscriptions
 * 2. Request the home feed using the authenticated member connection
 * 3. Validate the response structure contains pagination and data fields
 * 4. Verify the data array is empty
 * 5. Verify pagination shows 0 records and 0 pages
 */
export async function test_api_home_feed_empty_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member without subscribing to any communities
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Request the home feed
  const feed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {} satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Verify response structure has pagination and data fields
  TestValidator.predicate(
    "response has pagination field",
    feed.pagination !== undefined,
  );
  TestValidator.predicate("response has data field", feed.data !== undefined);
  // 4. Verify data array is empty
  TestValidator.equals("data array is empty", feed.data.length, 0);
  // 5. Verify pagination metadata shows 0 records and 0 pages
  TestValidator.equals("records count is 0", feed.pagination.records, 0);
  TestValidator.equals("pages count is 0", feed.pagination.pages, 0);
}
