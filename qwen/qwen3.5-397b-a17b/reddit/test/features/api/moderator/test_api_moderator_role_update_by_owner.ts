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
 * Test moderator role update by community owner.
 *
 * Validates the complete moderator role update workflow where a community owner promotes a moderator to owner role. The test verifies that the owner can successfully change a moderator's role assignment, the updated_at timestamp reflects the modification, and the response contains the correct new role value.
 *
 * Special attention is given to ensuring the role transition from 'moderator' to 'owner' completes successfully and that the moderator assignment record properly tracks the update through timestamp changes.
 *
 * 1. Owner member registers and authenticates using authorize_member_join utility.
 * 2. Owner creates a community using generate_random_reddit_community_member_communities_create.
 * 3. Second member registers and authenticates using authorize_member_join utility.
 * 4. Owner adds second member as moderator with 'moderator' role using generate_random_reddit_community_member_communities_moderators_create.
 * 5. Owner updates the moderator's role from 'moderator' to 'owner' using api.functional.redditCommunity.member.communities.moderators.update.
 * 6. Validate the role changed to 'owner', updated_at timestamp differs from created_at, and response structure is correct.
 */
export async function test_api_moderator_role_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member registers and authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Owner creates a community
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
  // 3. Second member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Owner adds second member as moderator with 'moderator' role
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
  TestValidator.equals(
    "initial role is moderator",
    moderatorAssignment.role,
    "moderator",
  );
  // 5. Owner updates the moderator's role from 'moderator' to 'owner'
  const updatedModerator =
    await api.functional.redditCommunity.member.communities.moderators.update(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
        body: {
          role: "owner",
        } satisfies IRedditCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);
  // 6. Validate the role change and timestamp update
  TestValidator.equals("role changed to owner", updatedModerator.role, "owner");
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedModerator.updated_at,
    updatedModerator.created_at,
  );
  TestValidator.equals(
    "moderator id preserved",
    updatedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "member id preserved",
    updatedModerator.member.id,
    memberAuth.id,
  );
}
