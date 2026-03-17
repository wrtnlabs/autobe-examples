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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";

/**
 * Test retrieving moderator assignment details for an appointed moderator (non-owner).
 *
 * Workflow:
 * 1. Register first member who will become community owner
 * 2. Owner creates a new community (automatically becomes owner-moderator)
 * 3. Register second member who will be appointed as moderator
 * 4. Owner adds second member as moderator to the community
 * 5. Retrieve the moderator assignment for the appointed moderator
 * 6. Validate: is_owner=false, addedBy contains owner's info, correct references, proper timestamps
 */
export async function test_api_moderator_retrieve_appointed_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
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
  typia.assert(ownerAuth);
  // 2. Owner creates a new community
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Register second member (to be appointed as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
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
  typia.assert(moderatorAuth);
  // 4. Owner adds second member as moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Retrieve the moderator assignment for the appointed moderator
  const retrievedModerator =
    await api.functional.redditClone.member.communities.moderators.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAuth.id,
      },
    );
  typia.assert(retrievedModerator);
  // 6. Validate moderator assignment details
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "is_owner is false for appointed moderator",
    retrievedModerator.is_owner,
    false,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator member ID matches",
    retrievedModerator.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "addedBy is owner (not null)",
    retrievedModerator.addedBy?.id ?? null,
    ownerAuth.id,
  );
  TestValidator.predicate("created_at is valid timestamp", () => {
    const createdAt = new Date(retrievedModerator.created_at);
    return createdAt.getTime() > 0 && createdAt.getTime() <= Date.now();
  });
  TestValidator.predicate("updated_at is valid timestamp", () => {
    const updatedAt = new Date(retrievedModerator.updated_at);
    return updatedAt.getTime() > 0 && updatedAt.getTime() <= Date.now();
  });
  TestValidator.equals(
    "deleted_at is null for active assignment",
    retrievedModerator.deleted_at,
    null,
  );
}
