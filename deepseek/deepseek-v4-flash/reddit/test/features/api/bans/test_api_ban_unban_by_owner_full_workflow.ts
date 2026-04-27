import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_ban_unban_by_owner_full_workflow(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Member A (owner) joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Member B subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 5. Member B creates a pre-ban post (text post)
  const preBanPost =
    await generate_random_community_platform_member_posts_create(
      memberBConnection,
      {
        body: {
          communityId: community.id,
          title: RandomGenerator.name(3),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(preBanPost);
  // 6. Owner bans Member B
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: memberB.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "ban targets correct member",
    ban.bannedMember.id,
    memberB.id,
  );
  // ---- Execution: Unban ----
  // 7. Owner unbans Member B via DELETE /member/bans/{banId}
  await api.functional.communityPlatform.member.bans.erase(memberAConnection, {
    banId: ban.id,
  });
  // ---- Verification ----
  // 8. Member B can create a new post after unban
  const newPost = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(3),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(newPost);
  TestValidator.equals(
    "new post author is Member B",
    newPost.author.id,
    memberB.id,
  );
  TestValidator.equals(
    "new post belongs to community",
    newPost.community.id,
    community.id,
  );
  // 9. Verify pre-ban post still exists and is accessible
  typia.assert(preBanPost);
  TestValidator.equals(
    "pre-ban post author preserved",
    preBanPost.author.id,
    memberB.id,
  );
  TestValidator.equals(
    "pre-ban post community preserved",
    preBanPost.community.id,
    community.id,
  );
}
