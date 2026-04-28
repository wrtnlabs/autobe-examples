import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostSnapshot";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
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
 * Test post snapshot retrieval as the authenticated post author.
 *
 * Validates that when a member creates a post in their subscribed community, an initial snapshot is automatically generated. The authenticated member then retrieves the snapshot history for their own post and verifies the returned snapshot data accurately reflects the original post creation state.
 *
 * 1. Member registers and authenticates.
 * 2. Member creates a new community.
 * 3. Member subscribes to the community.
 * 4. Member creates a text post (initial snapshot is auto-generated).
 * 5. Member retrieves post snapshots and validates response metadata.
 */
export async function test_api_post_snapshot_view_as_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create text post (generates initial snapshot)
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "text",
        community_id: community.id,
        body: postBody,
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve post snapshots for the created post
  const snapshotsResponse =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies IRedditLikeCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate response
  TestValidator.equals(
    "one snapshot exists",
    snapshotsResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "data array has one entry",
    snapshotsResponse.data.length,
    1,
  );
  const snapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "snapshot title matches post",
    snapshot.title,
    post.title,
  );
  TestValidator.equals("snapshot body matches post", snapshot.body, post.body);
  TestValidator.equals(
    "snapshot postType matches post",
    snapshot.postType,
    post.post_type,
  );
  TestValidator.equals(
    "snapshot community_id matches",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot author_id matches member",
    snapshot.author.id,
    memberAuthorized.id,
  );
  TestValidator.predicate("snapshot createdAt is valid date-time", () =>
    /^\d{4}-\d{2}-\d{T}|T+\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      snapshot.createdAt,
    ),
  );
}
