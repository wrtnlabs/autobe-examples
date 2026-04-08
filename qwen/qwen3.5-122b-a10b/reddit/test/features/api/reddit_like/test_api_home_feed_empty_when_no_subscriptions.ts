import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member with no community subscriptions receives an empty home feed.
 *
 * Validates the edge case where an authenticated member accesses their home feed without having subscribed to any communities. The API should return a successful response with an empty data array and valid pagination metadata indicating zero records.
 *
 * This test ensures that the home feed endpoint correctly handles the scenario where a user has not joined any communities yet, returning an empty result set rather than an error.
 *
 * 1. Create a new member account and authenticate.
 * 2. Access the home feed endpoint without subscribing to any communities.
 * 3. Validate that the response contains an empty data array.
 * 4. Validate that pagination metadata shows 0 records and 0 pages.
 * 5. Verify pagination current and limit values are valid.
 */
export async function test_api_home_feed_empty_when_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Access home feed without subscribing to any communities
  const feed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        limit: 25,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Validate empty feed response
  TestValidator.equals("data array is empty", feed.data.length, 0);
  TestValidator.equals("pagination records is 0", feed.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", feed.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current is valid",
    feed.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    feed.pagination.limit > 0,
  );
}
