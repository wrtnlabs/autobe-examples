import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test home feed for member with no subscriptions returns empty data array with pagination metadata showing records=0.
 *
 * Validates the edge case where an authenticated member has not subscribed to any community. The system should gracefully return a properly structured empty feed response rather than throwing an error. The response maintains consistency with paginated feed responses, containing zero items.
 *
 * 1. Creates a member-specific connection isolated from the base connection.
 * 2. Authenticates the member by registering a new account with generated credentials (email, password, username, and session context (href, referrer)).
 * 3. Request the authenticated member's home feed using an empty request body with no sorting or time filtering.
 * 4. Validates the paginated response: pagination.records equals 0 confirming no posts returned, data array length equals 0 confirming empty feed.
 */
export async function test_api_member_home_feed_empty_no_subscriptions(
  connection: api.IConnection,
) {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate member via join
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. Request home feed for the authenticated member
  const feed = await api.functional.redditLikeCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {} satisfies IREdditLikeCommunityCommunity.IHomeFeedRequest,
    },
  );
  // 4. Validate empty feed response
  typia.assert(feed);
  TestValidator.equals(
    "pagination records equals 0",
    feed.pagination.records,
    0,
  );
  TestValidator.equals("data array length equals 0", feed.data.length, 0);
}
