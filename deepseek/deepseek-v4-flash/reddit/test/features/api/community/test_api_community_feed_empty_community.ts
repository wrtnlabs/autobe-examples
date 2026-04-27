import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test viewing the post feed of a community that has no posts.
 *
 * Validates that the community feed endpoint correctly returns an empty result set when querying a valid, existing community with zero posts. This is an important edge case — the community exists, is visible in browse listings, but contains no content yet.
 *
 * The test covers the complete flow: member registration, community creation, and feed retrieval with empty-state pagination validation. Verifies that pagination metadata accurately reports zero records and zero pages while maintaining a valid current page number.
 *
 * 1. Register a new member account via `authorize_member_join`.
 * 2. Create a community via `generate_random_community_platform_member_communities_create`.
 * 3. Call the community feed endpoint with the community's name, passing an empty request body (all fields are optional).
 * 4. Validate the feed response: data array is empty, records=0, pages=0, current=1.
 */
export async function test_api_community_feed_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const member = await authorize_member_join(connection, {});
  typia.assert(member);
  // 2. Create an empty community (no posts will be created)
  const community =
    await generate_random_community_platform_member_communities_create(
      connection,
      {},
    );
  typia.assert(community);
  // 3. Call the community feed endpoint with no posts created
  const feed =
    await api.functional.communityPlatform.communities.posts.feeds.index(
      connection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(feed);
  // 4. Validate empty feed
  TestValidator.equals("empty data array", feed.data, []);
  TestValidator.equals("zero records", feed.pagination.records, 0);
  TestValidator.equals("zero pages", feed.pagination.pages, 0);
  TestValidator.equals("current page is 1", feed.pagination.current, 1);
}
