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
 * Test the business rule that prevents demoting or removing the community owner.
 *
 * Validates that the system enforces the critical business constraint ensuring every community maintains an owner with ultimate authority. The community creator holds the owner role permanently and cannot be demoted to a regular moderator.
 *
 * This test creates a community, registers the owner account, adds them as a moderator with owner role, then attempts to update their role from 'owner' to 'moderator'. The system should reject this request with a business logic error, not a type validation error.
 *
 * 1. Register owner account using authorize_member_join utility function.
 * 2. Create community using generate_random_reddit_community_member_communities_create (owner becomes owner automatically).
 * 3. Add owner as moderator entry with 'owner' role using generate_random_reddit_community_member_communities_moderators_create.
 * 4. Attempt to update owner's role from 'owner' to 'moderator' - should fail with business error.
 * 5. Validate that the error is thrown (not a type error, but a business logic rejection).
 */
export async function test_api_moderator_role_update_owner_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner account
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
  // 2. Create community (owner becomes owner automatically)
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
  // 3. Add owner as moderator with 'owner' role
  const ownerModerator =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: ownerAuth.id,
          role: "owner",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ownerModerator);
  TestValidator.equals("moderator role is owner", ownerModerator.role, "owner");
  TestValidator.equals(
    "moderator member matches owner",
    ownerModerator.member.id,
    ownerAuth.id,
  );
  // 4. Attempt to update owner's role from 'owner' to 'moderator' - should fail
  await TestValidator.error("owner cannot be demoted", async () => {
    await api.functional.redditCommunity.member.communities.moderators.update(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: ownerAuth.id,
        body: {
          role: "moderator",
        } satisfies IRedditCommunityModerator.IUpdate,
      },
    );
  });
}
