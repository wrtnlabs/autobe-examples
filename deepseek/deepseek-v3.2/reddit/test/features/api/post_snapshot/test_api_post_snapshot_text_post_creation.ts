import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { generate_random_community_platform_post_snapshots_create } from "../../../generate/generate_random_community_platform_post_snapshots_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_snapshot_text_post_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create member account using authorize_member_join utility
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community using member connection with authorization
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the subscribed community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a snapshot of the post
  const snapshot =
    await generate_random_community_platform_post_snapshots_create(
      connection, // Note: Post snapshots endpoint has no authorization requirement
      {
        body: {
          community_platform_post_id: post.id,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot attributes
  TestValidator.equals(
    "snapshot title matches post title",
    snapshot.snapshot_title,
    post.title,
  );
  TestValidator.equals(
    "snapshot content_type is 'text'",
    snapshot.snapshot_content_type,
    "text",
  );
  TestValidator.equals(
    "snapshot author ID matches post author ID",
    snapshot.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "snapshot community ID matches post community ID",
    snapshot.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "snapshot original post creation timestamp",
    snapshot.snapshot_created_at,
    post.created_at,
  );
  TestValidator.equals(
    "snapshot original post update timestamp",
    snapshot.snapshot_updated_at,
    post.updated_at,
  );
  TestValidator.equals(
    "snapshot original post deletion timestamp",
    snapshot.snapshot_deleted_at,
    post.deleted_at,
  );
  TestValidator.equals(
    "snapshot references original post",
    snapshot.post.id,
    post.id,
  );
  // Validate generated timestamps
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    () => snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has updated_at timestamp",
    () => snapshot.updated_at !== undefined,
  );
  // Validate business logic: snapshot captures post at creation time
  const snapshotCreated = new Date(snapshot.created_at);
  const postCreated = new Date(post.created_at);
  TestValidator.predicate(
    "snapshot created after or at post creation",
    () => snapshotCreated >= postCreated,
  );
}
