import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_posts_snapshots_create } from "../../../generate/generate_random_reddit_clone_member_posts_snapshots_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_snapshot } from "../../../prepare/prepare_random_reddit_clone_post_snapshot";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_snapshot_multiple_snapshots_same_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create TEXT type post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create first snapshot
  const snapshot1 =
    await generate_random_reddit_clone_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(snapshot1);
  // Wait a small delay to ensure different timestamps
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  // 6. Create second snapshot
  const snapshot2 =
    await generate_random_reddit_clone_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(snapshot2);
  // Validate both snapshots are created successfully with different IDs
  TestValidator.notEquals("snapshot IDs differ", snapshot1.id, snapshot2.id);
  // Both snapshots have same post title and content
  TestValidator.equals(
    "snapshot1 title matches post",
    snapshot1.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot2 title matches post",
    snapshot2.title,
    post.title,
  );
  TestValidator.equals(
    "both snapshots have same title",
    snapshot1.title,
    snapshot2.title,
  );
  TestValidator.equals(
    "snapshot1 content matches post",
    snapshot1.textContent,
    post.body,
  );
  TestValidator.equals(
    "snapshot2 content matches post",
    snapshot2.textContent,
    post.body,
  );
  TestValidator.equals(
    "both snapshots have same content",
    snapshot1.textContent,
    snapshot2.textContent,
  );
  // Each snapshot has unique createdAt timestamp (second snapshot is later)
  TestValidator.predicate("snapshot2 created after snapshot1", () => {
    return (
      new Date(snapshot2.createdAt).getTime() >
      new Date(snapshot1.createdAt).getTime()
    );
  });
  // Both snapshots reference the same post, member, and community
  TestValidator.equals("snapshot1 post ID", snapshot1.post.id, post.id);
  TestValidator.equals("snapshot2 post ID", snapshot2.post.id, post.id);
  TestValidator.equals(
    "snapshot1 member ID",
    snapshot1.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "snapshot2 member ID",
    snapshot2.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "snapshot1 community ID",
    snapshot1.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot2 community ID",
    snapshot2.community.id,
    community.id,
  );
  // Snapshots are independent records (not overwriting each other)
  TestValidator.notEquals(
    "snapshots have different timestamps",
    snapshot1.createdAt,
    snapshot2.createdAt,
  );
  TestValidator.equals(
    "snapshot1 post type",
    snapshot1.postType,
    post.post_type,
  );
  TestValidator.equals(
    "snapshot2 post type",
    snapshot2.postType,
    post.post_type,
  );
}
