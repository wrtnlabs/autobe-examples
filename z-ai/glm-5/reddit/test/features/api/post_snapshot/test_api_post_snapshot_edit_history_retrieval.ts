import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_snapshot_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Update the post 3 times to generate snapshots
  for (let i = 0; i < 3; i++) {
    const updatedPost =
      await api.functional.communityPlatform.member.posts.update(
        memberConnection,
        {
          postId: post.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            text_content: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ICommunityPlatformPost.IUpdate,
        },
      );
    typia.assert(updatedPost);
  }
  // 6. Retrieve edit history snapshots
  const snapshots =
    await api.functional.communityPlatform.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot count matches updates
  TestValidator.equals(
    "snapshot count matches updates",
    snapshots.data.length,
    3,
  );
  // 8. Validate snapshots are ordered by created_at DESC
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const current = snapshots.data[i];
    const next = snapshots.data[i + 1];
    TestValidator.predicate(
      "snapshots ordered by created_at DESC",
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
  // 9. Validate all snapshots have the same editor (the post author)
  const editorIds = new Set(snapshots.data.map((s) => s.editor.id));
  TestValidator.equals("all snapshots have same editor", editorIds.size, 1);
  TestValidator.equals(
    "editor is post author",
    snapshots.data[0].editor.id,
    authorized.id,
  );
}
