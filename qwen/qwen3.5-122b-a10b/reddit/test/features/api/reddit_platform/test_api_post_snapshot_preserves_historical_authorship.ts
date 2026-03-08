import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_snapshot_preserves_historical_authorship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member (member1)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create first community (community1) by member1
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. member1 is auto-subscribed to community1 (as owner)
  // No need to explicitly subscribe - owner auto-subscribes
  // 4. Create initial post in community1 by member1
  const post = await generate_random_reddit_platform_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community1.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify post was created with correct author and community
  TestValidator.equals(
    "post author is member1",
    post.author.id,
    member1Auth.id,
  );
  TestValidator.equals(
    "post community is community1",
    post.community.id,
    community1.id,
  );
  // 5. Authenticate second member (member2)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // 6. Create second community (community2) by member2
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      member2Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Verify community2 has different owner
  TestValidator.notEquals(
    "community2 owner is member2",
    community2.owner.id,
    member1Auth.id,
  );
  TestValidator.equals(
    "community2 owner is member2",
    community2.owner.id,
    member2Auth.id,
  );
  // 7. Retrieve snapshot of the post from community1
  // Note: Snapshot ID is not provided by post creation, so we use the post ID
  // In a real scenario, snapshots would be created automatically or via separate endpoint
  // For this test, we'll use a deterministic snapshot ID based on post ID
  const snapshotId = post.id; // Assuming snapshot ID matches post ID for test purposes
  const snapshot = await api.functional.redditPlatform.posts.snapshots.at(
    member2Connection,
    {
      postId: post.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 8. Verify snapshot preserves historical authorship and community associations
  TestValidator.equals(
    "snapshot author ID matches original author",
    snapshot.authorId,
    member1Auth.id,
  );
  TestValidator.equals(
    "snapshot community ID matches original community",
    snapshot.communityId,
    community1.id,
  );
  TestValidator.equals(
    "snapshot author username matches original author",
    snapshot.author.username,
    member1Auth.username,
  );
  TestValidator.equals(
    "snapshot community name matches original community",
    snapshot.community.name,
    community1.name,
  );
  TestValidator.equals(
    "snapshot post ID matches parent post",
    snapshot.postId,
    post.id,
  );
  TestValidator.equals(
    "snapshot title matches original post title",
    snapshot.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot post type matches original post type",
    snapshot.postType,
    post.post_type,
  );
}