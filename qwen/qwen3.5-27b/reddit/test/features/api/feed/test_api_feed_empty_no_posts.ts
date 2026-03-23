import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that feed returns empty result when no posts exist in the system.
 *
 * Setup:
 * 1. Register and authenticate a new member
 * 2. Do NOT create any posts - ensure system is in empty state
 *
 * Test:
 * 1. Call feed endpoint with feed_type='home'
 * 2. Verify response returns empty data array
 * 3. Verify pagination shows 0 records and 0 pages
 * 4. Verify current page is 1 (default)
 *
 * Validation:
 * - Feed correctly returns empty when no posts exist
 * - Pagination metadata reflects empty state
 * - Response structure is valid even with no data
 */
export async function test_api_feed_empty_no_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Call feed endpoint with feed_type='home' (no posts exist)
  const feed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Verify empty data array
  TestValidator.equals("data array is empty", feed.data.length, 0);
  // 4. Verify pagination shows 0 records
  TestValidator.equals("records count is 0", feed.pagination.records, 0);
  // 5. Verify pagination shows 0 pages
  TestValidator.equals("pages count is 0", feed.pagination.pages, 0);
  // 6. Verify current page is 1 (default)
  TestValidator.equals("current page is 1", feed.pagination.current, 1);
  // 7. Verify limit is set (default 100 based on API spec)
  TestValidator.predicate("limit is positive", feed.pagination.limit > 0);
}
