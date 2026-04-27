import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

/**
 * Test that a member cannot remove another member's vote, verifying the 403 Forbidden authorization check.
 *
 * This test validates the authorization layer of the vote removal endpoint. Only the original voter may remove their own vote. Attempting to delete a vote belonging to another member must be rejected with 403 Forbidden. The vote record, the target post's score, and the author's karma must remain unchanged after the rejected attempt.
 *
 * 1. Three members are registered via the join flow: Member A (original voter), Member B (unauthorized remover), Member C (post author).
 * 2. Member A creates a community on the platform.
 * 3. Member A and Member C subscribe to the community (required to create posts).
 * 4. Member C creates a text post within the community.
 * 5. Member A casts an upvote (+1) on Member C's post — the vote record is captured.
 * 6. Member B attempts to delete Member A's vote via the erase endpoint with Member A's vote ID.
 * 7. The attempt is rejected with 403 Forbidden.
 * 8. As a closing confirmation, Member A successfully deletes their own vote to verify the vote still existed.
 */
export async function test_api_vote_remove_other_members_vote_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register three members
  const memberAConn: api.IConnection = { host: connection.host };
  const memberAResult = await authorize_member_join(memberAConn, {});
  typia.assert(memberAResult);
  const memberBConn: api.IConnection = { host: connection.host };
  const memberBResult = await authorize_member_join(memberBConn, {});
  typia.assert(memberBResult);
  const memberCConn: api.IConnection = { host: connection.host };
  const memberCResult = await authorize_member_join(memberCConn, {});
  typia.assert(memberCResult);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConn,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          images: [
            {
              name: "icon.png",
              mime_type: "image/png",
              size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              url: typia.random<string & tags.Format<"uri">>(),
            },
          ],
        },
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subA =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConn,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subA);
  // 4. Member C subscribes to the community
  const subC =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberCConn,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subC);
  // 5. Member C creates a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberCConn,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member A casts an upvote (+1) on Member C's post
  const vote = await generate_random_community_platform_member_votes_create(
    memberAConn,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1 as const,
      },
    },
  );
  typia.assert(vote);
  // 7. Member B attempts to delete Member A's vote → 403 Forbidden
  await TestValidator.httpError(
    "member B cannot remove member A's vote",
    403,
    () =>
      api.functional.communityPlatform.member.votes.erase(memberBConn, {
        voteId: vote.id,
      }),
  );
  // 8. Confirmation: Member A can still delete their own vote
  await api.functional.communityPlatform.member.votes.erase(memberAConn, {
    voteId: vote.id,
  });
}
