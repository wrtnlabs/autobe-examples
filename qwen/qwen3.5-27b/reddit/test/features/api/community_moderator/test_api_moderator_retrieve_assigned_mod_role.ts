import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test retrieving an assigned moderator's details with 'mod' role.
 *
 * This test validates the moderator assignment workflow by:
 * 1. Creating a community owned by member1
 * 2. Adding member2 as a moderator with 'mod' role
 * 3. Retrieving the moderator assignment details
 * 4. Verifying role, member info, community info, and timestamps
 */
export async function test_api_moderator_retrieve_assigned_mod_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner (member1)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community owned by member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as second member (member2) who will become moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 4. Owner adds member2 as moderator with 'mod' role to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: moderatorAuth.id,
          role: "mod",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Retrieve the moderator assignment using GET endpoint
  const retrievedModerator =
    await api.functional.redditClone.member.communities.moderators.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAuth.id,
      },
    );
  typia.assert(retrievedModerator);
  // 6. Validate the retrieved moderator assignment
  // Verify role is 'mod' (not 'owner')
  TestValidator.equals(
    "moderator role is 'mod'",
    retrievedModerator.role,
    "mod",
  );
  // Verify moderator's member information matches member2
  TestValidator.equals(
    "moderator member ID matches",
    retrievedModerator.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderator username matches",
    retrievedModerator.member.username,
    moderatorAuth.username,
  );
  // Verify community details are accurate
  TestValidator.equals(
    "community ID matches",
    retrievedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedModerator.community.name,
    community.name,
  );
  // Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedModerator.created_at !== null &&
      retrievedModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedModerator.updated_at !== null &&
      retrievedModerator.updated_at !== undefined,
  );
  // Verify the assignment is active (not deleted)
  TestValidator.equals(
    "moderator assignment is active",
    retrievedModerator.deleted_at,
    null,
  );
}
