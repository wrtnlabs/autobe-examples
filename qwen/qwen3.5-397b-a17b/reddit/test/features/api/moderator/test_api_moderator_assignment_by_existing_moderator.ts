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
 * Test moderator delegation workflow where an existing moderator adds another moderator to the community.
 *
 * Validates the complete moderator delegation flow including owner community creation, first moderator assignment by owner, and second moderator assignment by the first moderator. Ensures that moderators (not just owners) have the authority to add new moderators to the community.
 *
 * The test verifies that the delegation pattern works correctly: owner creates community and adds first moderator, then first moderator can independently add additional moderators without owner intervention. This confirms the moderation authority delegation system functions as designed.
 *
 * 1. Owner member account is created and authenticated.
 * 2. Owner creates a new community with randomized name, description, and icon.
 * 3. First moderator member account is created and authenticated.
 * 4. Owner adds first member as moderator to the community with 'moderator' role.
 * 5. Second moderator member account is created and authenticated.
 * 6. First moderator (using their own connection) adds second member as moderator.
 * 7. Validates both moderator assignments exist with correct member IDs and roles.
 */
export async function test_api_moderator_assignment_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates community
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
  TestValidator.equals(
    "community owner matches",
    community.owner.id,
    ownerAuth.id,
  );
  // 3. Create first moderator account
  const firstModConnection: api.IConnection = { host: connection.host };
  const firstModAuth = await authorize_member_join(firstModConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(firstModAuth);
  // 4. Owner adds first member as moderator
  const firstModAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: firstModAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(firstModAssignment);
  TestValidator.equals(
    "first mod member ID",
    firstModAssignment.member.id,
    firstModAuth.id,
  );
  TestValidator.equals("first mod role", firstModAssignment.role, "moderator");
  // 5. Create second moderator account
  const secondModConnection: api.IConnection = { host: connection.host };
  const secondModAuth = await authorize_member_join(secondModConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(secondModAuth);
  // 6. First moderator adds second member as moderator (delegation test)
  const secondModAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      firstModConnection,
      {
        body: {
          memberId: secondModAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(secondModAssignment);
  // 7. Validate second moderator assignment
  TestValidator.equals(
    "second mod member ID",
    secondModAssignment.member.id,
    secondModAuth.id,
  );
  TestValidator.equals(
    "second mod role",
    secondModAssignment.role,
    "moderator",
  );
  TestValidator.notEquals(
    "moderator assignments have different IDs",
    firstModAssignment.id,
    secondModAssignment.id,
  );
}
