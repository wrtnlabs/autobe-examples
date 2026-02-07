import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_feed_positions_member_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Create a post in a community
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: typia.random<ICommunityPost.ICreate>(),
    },
  );
  // We know the type system is incorrect, but we need to assert the actual response structure
  const safePost = typia.assert<Omit<ICommunityPost, 'id'> & { id: string }>(post);
  // 3. Query feed positions for the created post
  const feedEntry = await api.functional.community.posts.feed_entries.index(
    memberConnection,
    {
      postId: safePost.id,
    },
  );
  const safeFeedEntry = typia.assert<Omit<ICommunityPostFeed, 'feed_type' | 'sort_algorithm' | 'sort_order' | 'post_id'> & {
    feed_type: 'home' | 'popular' | 'community';
    sort_algorithm: 'hot' | 'new' | 'top' | 'controversial';
    sort_order: number;
    post_id: string;
  }>(feedEntry);
  // 4. Validate the feed entry properties
  // The endpoint returns a single ICommunityPostFeed object, representing one of the possible feed positions.
  // We cannot validate all 12 combinations as the schema defines only a single entry.
  // Validate that the returned entry has valid properties consistent with expected values.
  // Validate feed_type is one of: home, popular, community
  TestValidator.predicate("feed_type is valid", () => {
    const validFeeds = ["home", "popular", "community"] as const;
    return validFeeds.includes(safeFeedEntry.feed_type);
  });
  // Validate sort_algorithm is one of: hot, new, top, controversial
  TestValidator.predicate("sort_algorithm is valid", () => {
    const validSorts = ["hot", "new", "top", "controversial"] as const;
    return validSorts.includes(safeFeedEntry.sort_algorithm);
  });
  // Validate sort_order is a positive integer
  TestValidator.predicate("sort_order is a positive integer", () => {
    return Number.isInteger(safeFeedEntry.sort_order) && safeFeedEntry.sort_order > 0;
  });
  // Validate post_id matches the created post
  TestValidator.equals(
    "post_id matches created post",
    safeFeedEntry.post_id,
    safePost.id,
  );
}