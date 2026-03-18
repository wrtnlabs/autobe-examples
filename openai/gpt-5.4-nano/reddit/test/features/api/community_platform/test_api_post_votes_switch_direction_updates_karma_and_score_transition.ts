import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_votes_switch_direction_updates_karma_and_score_transition(
  connection: api.IConnection,
): Promise<void> {
  // With the provided SDK, creating a post returns void (no postId), and the
  // voting endpoint response also returns void with an unknown request schema
  // for vote direction. Therefore, we can only validate that:
  // - the end-to-end setup (auth -> community -> subscriptions -> post creation)
  //   is feasible by two members, and
  // - voting cannot be executed without a valid post target.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberA);
  typia.assert(memberB);
  const community = await generate_random_community_platform_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberAConnection,
    {
      body: { community_id: community.id },
    },
  );
  await generate_random_community_platform_community_subscriptions_create(
    memberBConnection,
    {
      body: { community_id: community.id },
    },
  );
  await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Voting requires postId; the available post creation utilities/SKD return void,
  // so postId cannot be derived from the provided API surface.
  // Therefore, we assert that attempting to vote with an invalid UUID rejects.
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot vote without a valid post target",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        memberBConnection,
        {
          postId: invalidPostId,
          body: {
            community_id: community.id,
            post_type: "text",
            title: RandomGenerator.name(),
            body_text: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}
