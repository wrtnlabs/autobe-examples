import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test that authenticated members with no community subscriptions receive an empty home feed.
 *
 * **Setup:**
 * 1. Create a new test member account via authorize_member_join utility
 * 2. Create another member account to own communities and posts
 * 3. Create communities and posts using the other member (test member has no subscriptions)
 *
 * **Test Execution:**
 * 1. Call PATCH /redditClone/member/feeds/home with test member's connection
 * 2. Verify response contains empty data array
 * 3. Verify pagination shows: current=1, limit=default, records=0, pages=0
 *
 * **Validation Points:**
 * - Response structure is valid with empty data array
 * - Pagination metadata correctly reflects zero records
 * - No posts appear when user has no subscriptions
 * - Request succeeds without authentication or business logic errors
 *
 * **Edge Case:**
 * This validates the boundary condition where a newly registered member who hasn't
 * subscribed to any communities yet can still access their home feed endpoint without
 * errors, receiving an empty but well-formed response.
 */
export async function test_api_home_feed_empty_when_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member with no subscriptions
  const testMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(testMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create another member to own communities and posts
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 3. Create community with other member (test member not subscribed)
  const community = await generate_random_reddit_clone_communities_create(
    otherMemberConnection,
    {},
  );
  // 4. Create post in the community with other member
  const post = await generate_random_reddit_clone_member_posts_create(
    otherMemberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 5. Test member calls home feed - should be empty
  const feed = await api.functional.redditClone.member.feeds.home.index(
    testMemberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feed);
  // 6. Validate empty feed
  TestValidator.equals("data array is empty", feed.data.length, 0);
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.equals("records count", feed.pagination.records, 0);
  TestValidator.equals("total pages", feed.pagination.pages, 0);
}
