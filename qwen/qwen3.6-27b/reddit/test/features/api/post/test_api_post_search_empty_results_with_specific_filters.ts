import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test post search returns empty results with specific filters that match no posts.
 *
 * Validates that the post search endpoint gracefully handles empty result sets when filter criteria don't match any existing posts. Tests multiple scenarios: filtering by post_type that doesn't exist, combining filters that produce no matches, and searching within non-existent communities.
 *
 * Special attention is given to verifying that pagination metadata correctly reflects zero results (records=0, pages=0) and that the data array is empty, ensuring consistent response structure even with no matching data.
 *
 * 1. Member registers and authenticates
 * 2. Admin-like member creates a community
 * 3. Member subscribes to the community
 * 4. Multiple text posts are created in the community
 * 5. Search with post_type='link' returns empty (only text posts exist)
 * 6. Search with post_type='image' + non-matching keyword returns empty
 * 7. Search with non-existent community_id returns empty
 */
export async function test_api_post_search_empty_results_with_specific_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = RandomGenerator.name(1);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple text posts
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    const post =
      await generate_random_reddit_like_community_member_posts_create(
        memberConnection,
        {
          body: {
            title: typia.random<string>(),
            post_type: "text",
            community_id: community.id,
            body: typia.random<string>(),
          } satisfies IREdditLikeCommunityPost.ICreate,
        },
      );
    typia.assert(post);
    return post;
  });
  // 5. Test: Search with post_type='link' when only text posts exist
  const filterBodyLink = {
    post_type: "link" as const,
  } satisfies IREdditLikeCommunityPost.IRequest;
  const linkFilterResult = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    { body: filterBodyLink },
  );
  typia.assert(linkFilterResult);
  TestValidator.equals(
    "link filter returns empty data array",
    linkFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "link filter pagination records is 0",
    linkFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "link filter pagination pages is 0",
    linkFilterResult.pagination.pages,
    0,
  );
  // 6. Test: Search with post_type='image' + non-matching search keyword
  const filterBodyImageSearch = {
    post_type: "image" as const,
    search: "xyznonexistentkeyword123",
  } satisfies IREdditLikeCommunityPost.IRequest;
  const imageSearchResult =
    await api.functional.redditLikeCommunity.posts.index(memberConnection, {
      body: filterBodyImageSearch,
    });
  typia.assert(imageSearchResult);
  TestValidator.equals(
    "image+search filter returns empty data array",
    imageSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "image+search filter pagination records is 0",
    imageSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "image+search filter pagination pages is 0",
    imageSearchResult.pagination.pages,
    0,
  );
  // 7. Test: Search with non-existent community_id
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const filterBodyNonExistent = {
    community_id: nonExistentCommunityId,
  } satisfies IREdditLikeCommunityPost.IRequest;
  const nonExistentResult =
    await api.functional.redditLikeCommunity.posts.index(memberConnection, {
      body: filterBodyNonExistent,
    });
  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent community filter returns empty data array",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent community filter pagination records is 0",
    nonExistentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent community filter pagination pages is 0",
    nonExistentResult.pagination.pages,
    0,
  );
}
