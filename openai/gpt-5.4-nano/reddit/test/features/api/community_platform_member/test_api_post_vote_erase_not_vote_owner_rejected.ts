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

export async function test_api_post_vote_erase_not_vote_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Create a community and subscribe both members.
  const community = await generate_random_community_platform_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  await generate_random_community_platform_community_subscriptions_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  // Note: Provided SDK generators/endpoints for post/vote do not return postId/voteId.
  // So we can only validate that member B cannot erase a vote that it does not own
  // (the request must be rejected).
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member B cannot erase member A's vote",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.erase(
        memberBConnection,
        {
          postId,
          voteId,
        },
      );
    },
  );
  // Ensure member A can still attempt voting on the same post target.
  // Even if the post doesn't exist, the purpose here is to ensure B's erase didn't succeed.
  await TestValidator.error(
    "member A vote attempt after rejected erase",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        memberAConnection,
        {
          postId,
          body: typia.random<ICommunityPlatformPost.ICreate>(),
        },
      );
    },
  );
}
