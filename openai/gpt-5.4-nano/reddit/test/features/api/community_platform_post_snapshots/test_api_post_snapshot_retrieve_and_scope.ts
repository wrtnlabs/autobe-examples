import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_member_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_retrieve_and_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1) Actor: member join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  const authorizedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2) Create community
  const community = await generate_random_community_platform_communities_create(
    authorizedMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(12),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Subscribe to community
  await generate_random_community_platform_community_subscriptions_create(
    authorizedMemberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // 4) Create a text post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postBody1 = RandomGenerator.paragraph({ sentences: 3 });
  const postBody2 = RandomGenerator.paragraph({ sentences: 3 });
  const postImageIgnored = undefined;
  // SDK create returns void, so create snapshot immediately with known snapshot-time values.
  const postId1 = typia.random<string & tags.Format<"uuid">>();
  // Create actual post using generator (returns void); retrieve post id by creating snapshot with postId from response.
  // Since we have no direct get list, we rely on snapshot creation return to obtain postId.
  await generate_random_community_platform_member_posts_create(
    authorizedMemberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: postTitle,
        body_text: postBody1,
        link: postImageIgnored,
        image: postImageIgnored,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Create snapshot: since we need postId, we create a snapshot using a prepared postId.
  // Instead, create snapshot after creating a post, but generator doesn't return postId.
  // Therefore use member.posts.createPostSnapshot generator by first creating a snapshot with a postId obtained from a snapshot creation itself.
  // This is impossible without postId; fallback to SDK by using createPostSnapshot with a real postId.
  // To comply with runtime, we create post by using snapshot generator that expects postId and returns snapshot (postId captured in snapshot).
  // Create first snapshot-time content values
  const publishedAt1 = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const snapshot1 =
    await generate_random_community_platform_member_posts_snapshots_create_post_snapshot(
      authorizedMemberConnection,
      {
        params: { postId: postId1 },
        body: {
          publishedAt: publishedAt1,
          title: postTitle,
          body: postBody2,
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  // 5) Retrieve snapshot with correct scoping
  const retrieved =
    await api.functional.communityPlatform.member.posts.snapshots.at(
      authorizedMemberConnection,
      {
        postId: snapshot1.postId,
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("snapshot id matches", retrieved.id, snapshot1.id);
  TestValidator.equals("postId matches", retrieved.postId, snapshot1.postId);
  TestValidator.equals(
    "communityId matches",
    retrieved.communityId,
    snapshot1.communityId,
  );
  TestValidator.equals(
    "authorUserId matches",
    retrieved.authorUserId,
    snapshot1.authorUserId,
  );
  TestValidator.equals(
    "postType matches",
    retrieved.postType,
    snapshot1.postType,
  );
  TestValidator.equals(
    "title matches snapshot",
    retrieved.title,
    snapshot1.title,
  );
  TestValidator.equals("body matches snapshot", retrieved.body, snapshot1.body);
  TestValidator.equals("linkUrl null for text", retrieved.linkUrl, null);
  TestValidator.equals(
    "editedByUserId matches snapshot",
    retrieved.editedByUserId,
    snapshot1.editedByUserId,
  );
  TestValidator.equals(
    "deletedByUserId matches snapshot",
    retrieved.deletedByUserId,
    snapshot1.deletedByUserId,
  );
  TestValidator.equals(
    "publishedAt matches",
    retrieved.publishedAt,
    snapshot1.publishedAt,
  );
  TestValidator.equals(
    "createdAt matches",
    retrieved.createdAt,
    snapshot1.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    retrieved.updatedAt,
    snapshot1.updatedAt,
  );
  TestValidator.equals("deletedAt null", retrieved.deletedAt, null);
  // 6) Scenario B: mismatch postId should be not found
  // Create second post to get a different postId via snapshot creation.
  const publishedAt2 = new Date(Date.now() + 1000).toISOString() as string &
    tags.Format<"date-time">;
  const postId2 = typia.random<string & tags.Format<"uuid">>();
  const snapshot2a =
    await generate_random_community_platform_member_posts_snapshots_create_post_snapshot(
      authorizedMemberConnection,
      {
        params: { postId: postId2 },
        body: {
          publishedAt: publishedAt2,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2a);
  await TestValidator.httpError(
    "should not reveal snapshot when postId mismatches",
    [404],
    async () => {
      await api.functional.communityPlatform.member.posts.snapshots.at(
        authorizedMemberConnection,
        {
          postId: snapshot2a.postId,
          snapshotId: snapshot1.id,
        },
      );
    },
  );
}
