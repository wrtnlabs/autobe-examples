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

export async function test_api_post_snapshot_editor_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (post author and first editor)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Create a community owned by Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Subscribe Member A to the community for posting privileges
  await generate_random_community_platform_member_subscriptions_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a text post as Member A
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // 5. Update the post as Member A (creates snapshot 1)
  await api.functional.communityPlatform.member.posts.update(
    memberAConnection,
    {
      postId: post.id,
      body: {
        title: `${post.title} - Updated by Member A`,
        text_content: `${post.text_content} - First edit by Member A`,
      },
    },
  );
  // 6. Register Member B (second editor)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 7. Subscribe Member B to the community for editing privileges
  await generate_random_community_platform_member_subscriptions_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  // 8. Update the post as Member B (creates snapshot 2)
  await api.functional.communityPlatform.member.posts.update(
    memberBConnection,
    {
      postId: post.id,
      body: {
        title: `${post.title} - Updated by Member B`,
        text_content: "Content modified by Member B",
      },
    },
  );
  // 9. Update the post again as Member A (creates snapshot 3)
  await api.functional.communityPlatform.member.posts.update(
    memberAConnection,
    {
      postId: post.id,
      body: {
        title: `${post.title} - Final update by Member A`,
        text_content: "Final content from Member A",
      },
    },
  );
  // Test: Filter snapshots by Member B's editor_id
  const filteredSnapshots =
    await api.functional.communityPlatform.member.posts.snapshots.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          editor_id: memberB.id,
        },
      },
    );
  typia.assert(filteredSnapshots);
  // Validation: Only Member B's snapshots are returned
  TestValidator.predicate(
    "has filtered results",
    filteredSnapshots.data.length > 0,
  );
  TestValidator.predicate(
    "all editors are Member B",
    filteredSnapshots.data.every(
      (snapshot) => snapshot.editor.id === memberB.id,
    ),
  );
  TestValidator.predicate(
    "no Member A snapshots",
    filteredSnapshots.data.every(
      (snapshot) => snapshot.editor.id !== memberA.id,
    ),
  );
  // Validation: Editor profile information is correct
  const memberBSnapshot = filteredSnapshots.data[0];
  TestValidator.equals(
    "editor username matches",
    memberBSnapshot.editor.username,
    memberB.username,
  );
  TestValidator.equals(
    "editor display name matches",
    memberBSnapshot.editor.display_name,
    memberB.displayName,
  );
}
