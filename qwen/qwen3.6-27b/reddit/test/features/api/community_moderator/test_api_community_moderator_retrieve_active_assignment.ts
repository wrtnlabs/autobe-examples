import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test retrieving an active community moderator assignment with all JOINed relational data.
 *
 * Validates the complete moderator retrieval flow including member registration, community creation by an owner member, moderator assignment, and fetching the full moderator record. Ensures that all relational JOINs work correctly and return complete moderator details including community summary, member summary, and profile summary.
 *
 * The test verifies that the moderator assignment contains the expected role level, correct community reference, assigned member identity, and the moderator's public profile information with karma score.
 *
 * 1. Register two members: one acting as community owner, another as moderator-to-be.
 * 2. Owner member creates a community and becomes the owner.
 * 3. Owner member assigns the second member as a moderator in the community.
 * 4. Retrieve the full moderator assignment via the detail GET endpoint.
 * 5. Validate all JOINed data including community, member, and profile summaries.
 */
export async function test_api_community_moderator_retrieve_active_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const ownerMember: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: { email: ownerEmail },
    });
  typia.assert(ownerMember);
  // 2. Register second member to be assigned as moderator
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const modEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const modMember: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(secondMemberConnection, {
      body: { email: modEmail },
    });
  typia.assert(modMember);
  // 3. Owner creates a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner assigns second member as moderator
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await generate_random_reddit_like_community_member_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: modMember.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Retrieve the moderator assignment detail via GET endpoint
  const retrievedModerator: IREdditLikeCommunityCommunityModerator =
    await api.functional.redditLikeCommunity.communities.community_moderators.at(
      ownerConnection,
      {
        communityId: community.id,
        communityModeratorId: moderatorAssignment.id,
      },
    );
  typia.assert(retrievedModerator);
  // 6. Validate relational JOINs and business logic
  TestValidator.equals(
    "moderator id matches assignment id",
    retrievedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "role is moderator",
    retrievedModerator.role,
    "moderator",
  );
  TestValidator.equals(
    "community id matches created community",
    retrievedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "member id matches second member",
    retrievedModerator.member.id,
    modMember.id,
  );
  TestValidator.equals(
    "member email matches registration email",
    retrievedModerator.member.email,
    modEmail,
  );
  TestValidator.equals(
    "community creator is the owner",
    retrievedModerator.community.creator.id,
    ownerMember.id,
  );
  TestValidator.predicate(
    "profile karma is a valid number",
    typeof retrievedModerator.profile.karma === "number",
  );
  TestValidator.predicate(
    "profile created_at is a non-empty string",
    typeof retrievedModerator.profile.created_at === "string" &&
      retrievedModerator.profile.created_at.length > 0,
  );
}
