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

export async function test_api_post_snapshot_multiple_versions(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection from base connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create initial text post
  const initialPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(initialPost);
  TestValidator.equals(
    "post should be text type",
    initialPost.content_type,
    "TEXT",
  );
  // Safe type check for text content
  if (initialPost.content_type === "TEXT") {
    const textContent = initialPost.content as ICommunityPlatformPostText;
    TestValidator.predicate(
      "text content should exist",
      textContent.content !== undefined,
    );
  }
  // 5. Create first snapshot (original state)
  const snapshot1 =
    await generate_random_community_platform_post_snapshots_create(
      memberConnection,
      {
        body: {
          community_platform_post_id: initialPost.id,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  // Validate first snapshot matches original post
  TestValidator.equals(
    "snapshot1 post reference matches",
    snapshot1.post.id,
    initialPost.id,
  );
  TestValidator.equals(
    "snapshot1 title matches original",
    snapshot1.snapshot_title,
    initialPost.title,
  );
  TestValidator.equals(
    "snapshot1 content type is text",
    snapshot1.snapshot_content_type,
    "text",
  );
  TestValidator.equals(
    "snapshot1 author matches",
    snapshot1.author.id,
    member.id,
  );
  TestValidator.equals(
    "snapshot1 community matches",
    snapshot1.community.id,
    community.id,
  );
  // 6. Edit the post
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedContent = RandomGenerator.paragraph({ sentences: 4 });
  const editedPost = await api.functional.communityPlatform.member.posts.update(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        title: updatedTitle,
        textContent: {
          content: updatedContent,
          formatting: "markdown",
        } satisfies ICommunityPlatformPostText.IUpdate,
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(editedPost);
  TestValidator.equals(
    "edited post title updated",
    editedPost.title,
    updatedTitle,
  );
  TestValidator.notEquals(
    "edited post title differs from original",
    editedPost.title,
    initialPost.title,
  );
  // 7. Create second snapshot (edited state)
  const snapshot2 =
    await generate_random_community_platform_post_snapshots_create(
      memberConnection,
      {
        body: {
          community_platform_post_id: initialPost.id,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  // Validate second snapshot
  TestValidator.equals(
    "snapshot2 post reference matches",
    snapshot2.post.id,
    initialPost.id,
  );
  TestValidator.equals(
    "snapshot2 title matches edited",
    snapshot2.snapshot_title,
    editedPost.title,
  );
  TestValidator.equals(
    "snapshot2 content type is text",
    snapshot2.snapshot_content_type,
    "text",
  );
  TestValidator.notEquals(
    "snapshot IDs should be unique",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.notEquals(
    "snapshot timestamps should differ",
    snapshot1.created_at,
    snapshot2.created_at,
  );
  TestValidator.notEquals(
    "snapshot1 and snapshot2 titles differ",
    snapshot1.snapshot_title,
    snapshot2.snapshot_title,
  );
  TestValidator.equals(
    "snapshot1 title matches initial post",
    snapshot1.snapshot_title,
    initialPost.title,
  );
  TestValidator.equals(
    "snapshot2 title matches edited post",
    snapshot2.snapshot_title,
    editedPost.title,
  );
}
