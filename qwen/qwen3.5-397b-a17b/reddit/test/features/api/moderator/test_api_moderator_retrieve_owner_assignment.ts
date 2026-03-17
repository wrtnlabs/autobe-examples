import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test retrieving moderator assignment details for a community owner.
 *
 * This test verifies that when a member creates a community, they automatically
 * become the owner with moderator privileges. The test:
 * 1. Registers a new member account
 * 2. Creates a new community (member becomes owner automatically)
 * 3. Retrieves the moderator assignment record for the owner
 * 4. Validates is_owner=true, addedBy=null, correct community and member references
 */
export async function test_api_moderator_retrieve_owner_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authorized response
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Create a new community - member automatically becomes owner
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Retrieve moderator assignment for the owner (member themselves)
  const moderator =
    await api.functional.redditClone.member.communities.moderators.at(
      memberConnection,
      {
        communityId: community.id,
        moderatorId: memberAuth.id,
      },
    );
  typia.assert(moderator);
  // 5. Validate owner moderator assignment
  TestValidator.equals("is_owner flag", moderator.is_owner, true);
  TestValidator.equals("addedBy is null for owner", moderator.addedBy, null);
  TestValidator.equals(
    "community id matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    moderator.community.name,
    community.name,
  );
  TestValidator.equals(
    "moderator member id",
    moderator.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "moderator username",
    moderator.member.username,
    memberAuth.username,
  );
  TestValidator.predicate(
    "has valid created_at",
    moderator.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    moderator.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", moderator.deleted_at, null);
}
