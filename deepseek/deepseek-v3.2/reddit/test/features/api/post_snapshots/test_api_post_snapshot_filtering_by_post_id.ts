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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_snapshot_filtering_by_post_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
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
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create initial text post
  const initialPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: "Initial Post Title",
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.content({ paragraphs: 1 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(initialPost);
  // 5. Update the post to generate new snapshot
  const updatedTitle = "Updated Post Title";
  const updatedContent = RandomGenerator.content({ paragraphs: 1 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: initialPost.id,
        body: {
          title: updatedTitle,
          textContent: {
            content: updatedContent,
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.IUpdate,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 6. Create base connection for snapshot query (no auth required)
  const snapshotConnection: api.IConnection = { host: connection.host };
  // Query snapshots filtered by the specific post ID
  const snapshots = await api.functional.communityPlatform.post_snapshots.index(
    snapshotConnection,
    {
      body: {
        community_platform_post_id: initialPost.id,
        limit: 100,
      } satisfies ICommunityPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 7. Validate snapshot results - business logic testing
  TestValidator.equals(
    "should have exactly 2 snapshots for the post",
    snapshots.data.length,
    2,
  );
  TestValidator.equals(
    "total records should be 2",
    snapshots.pagination.records,
    2,
  );
  TestValidator.equals(
    "should have exactly 1 page",
    snapshots.pagination.pages,
    1,
  );
  TestValidator.equals(
    "current page should be 1",
    snapshots.pagination.current,
    1,
  );
  // 8. Verify snapshot ordering and content - business logic
  // Sort by created_at to get chronological order
  const sortedSnapshots = [...snapshots.data].sort((a, b) =>
    a.snapshot_created_at.localeCompare(b.snapshot_created_at),
  );
  // The earlier snapshot should have the initial title
  TestValidator.equals(
    "first snapshot should have initial title",
    sortedSnapshots[0].snapshot_title,
    initialPost.title,
  );
  // The later snapshot should have the updated title
  TestValidator.equals(
    "second snapshot should have updated title",
    sortedSnapshots[1].snapshot_title,
    updatedTitle,
  );
  // 9. Validate all snapshots belong to the correct post
  TestValidator.predicate(
    "all snapshots should have TEXT content type",
    snapshots.data.every((s) => s.snapshot_content_type === "TEXT"),
  );
}
