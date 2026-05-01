import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
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
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test popular feed pagination metadata with minimal content baseline.
 *
 * Validates that the popular feed returns correct pagination metadata when the
 * system contains exactly one post. The test registers a new member, creates a
 * community, and publishes a single text post to establish minimal feed content.
 * It then fetches the publicly accessible popular feed — no authentication
 * required — and verifies pagination metadata accuracy: total records, current
 * page, total pages, and the contained post data.
 *
 * Although the SDK does not currently expose page/limit query parameters for
 * this endpoint, the test validates the default pagination behavior and
 * establishes the foundation for verifying the specification's requirement that
 * navigating beyond the last available page returns an empty result set rather
 * than an error.
 *
 * 1. Member joins the platform with random credentials and receives JWT tokens.
 * 2. Member creates a new community and becomes its permanent owner.
 * 3. Member publishes a text-type post in the newly created community.
 * 4. Popular feed is retrieved without authentication from a guest connection.
 * 5. Pagination metadata is validated for correctness against the expected
 *    single-record dataset, and the post identity matches the created record.
 */
export async function test_api_popular_feed_pagination_beyond_last_page(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Fetch popular feed (public endpoint, no authentication required)
  const feed = await api.functional.communityHub.feed.popular(connection);
  typia.assert(feed);
  // 5. Validate pagination metadata
  TestValidator.equals("total records", feed.pagination.records, 1);
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.predicate(
    "total pages at least one",
    feed.pagination.pages >= 1,
  );
  TestValidator.predicate("limit is positive", feed.pagination.limit > 0);
  TestValidator.equals("data array length", feed.data.length, 1);
  TestValidator.equals("post id matches", feed.data[0].id, post.id);
  TestValidator.equals("post title matches", feed.data[0].title, post.title);
}
