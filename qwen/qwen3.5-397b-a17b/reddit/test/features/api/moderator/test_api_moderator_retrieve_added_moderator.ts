import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test retrieving moderator details for a moderator added by the community owner.
 *
 * Validates the complete moderator retrieval workflow including community owner authentication, community creation, second member registration, moderator assignment, and moderator details retrieval. Ensures that the moderator role, assignment timestamp, and member profile information are correctly returned.
 *
 * Special attention is given to verifying that the moderator assignment exists for the specified community, the role is correctly set to 'moderator', and the nested member object contains the second member's public profile information.
 *
 * 1. Community owner authenticates via member join.
 * 2. Owner creates a new community (automatically becomes owner).
 * 3. Second member authenticates via member join with different credentials.
 * 4. Owner adds second member as moderator with role='moderator'.
 * 5. Owner retrieves the added moderator's details using community ID and member ID.
 * 6. Validates response contains correct role, assigned_at timestamp, member profile, and all required fields with deleted_at null.
 */
export async function test_api_moderator_retrieve_added_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community - owner becomes the first member automatically
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate as second member (to be added as moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(memberAuth);
  // 4. Owner adds second member as moderator with role='moderator'
  const moderatorAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: memberAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Owner retrieves the added moderator's details
  const retrievedModerator =
    await api.functional.redditCommunity.member.communities.moderators.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: memberAuth.id,
      },
    );
  typia.assert(retrievedModerator);
  // 6. Validate response
  TestValidator.equals("moderator role", retrievedModerator.role, "moderator");
  TestValidator.equals(
    "moderator id matches assignment",
    retrievedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "member id matches",
    retrievedModerator.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member username matches",
    retrievedModerator.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "member display_name exists",
    typeof retrievedModerator.member.display_name,
    "string",
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedModerator.deleted_at,
    null,
  );
}
