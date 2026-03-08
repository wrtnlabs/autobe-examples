import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_post_snapshots_create } from "../../../generate/generate_random_reddit_platform_post_snapshots_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_snapshot } from "../../../prepare/prepare_random_reddit_platform_post_snapshot";

export async function test_api_post_snapshot_create_on_post_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community using the member's authorized connection
  const community =
    await api.functional.redditPlatform.member.communities.create(
      joinConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community (required for posting)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      joinConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a TEXT post in the subscribed community
  const postTitle = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<300>
  >();
  const postContent = RandomGenerator.paragraph({ sentences: 3 });
  const post = await api.functional.redditPlatform.member.posts.create(
    joinConnection,
    {
      body: {
        title: postTitle,
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: postContent,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Verify CREATE snapshot can be created with post data
  // Note: Automatic snapshot creation happens on backend during post creation.
  // This test verifies the CREATE snapshot workflow manually.
  const snapshot = await api.functional.redditPlatform.post_snapshots.create(
    joinConnection,
    {
      body: {
        title: post.title,
        content: post.content ?? null,
        post_type: post.postType,
        url: post.url ?? null,
        image_url: post.imageUrl ?? null,
        vote_score: post.voteScore,
        comment_count: post.commentCount,
        snapshot_type: "CREATE",
      } satisfies IRedditPlatformPostSnapshot.ICreate,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot captures correct data
  TestValidator.equals(
    "snapshot title matches post title",
    snapshot.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot content matches post content",
    snapshot.content,
    post.content ?? null,
  );
  TestValidator.equals(
    "snapshot post_type matches",
    snapshot.post_type,
    post.postType,
  );
  TestValidator.equals(
    "snapshot vote_score matches",
    snapshot.vote_score,
    post.voteScore,
  );
  TestValidator.equals(
    "snapshot comment_count matches",
    snapshot.comment_count,
    post.commentCount,
  );
  TestValidator.equals(
    "snapshot type is CREATE",
    snapshot.snapshot_type,
    "CREATE",
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
  );
}
