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

/**
 * Test that a banned user cannot create a post in a community and receives a rejected error.
 *
 * Validates the ban enforcement business rule for post creation. A member who has been banned from a community must be rejected when attempting to create a post, even though they are still subscribed to that community.
 *
 * The test follows a complete workflow: administrator (Member A) creates a community, target user (Member B) joins and subscribes, administrator bans the target user, and the target user attempts to post. The ban is community-scoped and does not affect the user's subscription status.
 *
 * 1. Member A joins the platform and creates a community.
 * 2. Member B joins the platform and subscribes to the community.
 * 3. Member A bans Member B from the community with a reason.
 * 4. Member B attempts to create a text post in the community.
 * 5. Asserts that the post creation fails with HTTP 403 or 422.
 */
export async function test_api_post_creation_banned_user_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Member B joins and subscribes to the community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 3. Member A bans Member B from the community
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: memberB.id,
          reason: "Violation of community rules",
        },
      },
    );
  typia.assert(ban);
  // 4. Member B attempts to create a post and should be rejected
  await TestValidator.httpError(
    "banned user cannot create post",
    [403, 422],
    async () => {
      await api.functional.communityPlatform.member.posts.create(
        memberBConnection,
        {
          body: {
            communityId: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            type: "text",
            body: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}
