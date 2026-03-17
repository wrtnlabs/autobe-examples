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
 * Test moderator assignment by community owner.
 *
 * This test validates that a community owner can successfully add another
 * member as a moderator to their community. The test verifies:
 * 1. Community owner authentication and community creation
 * 2. Target member account creation
 * 3. Moderator assignment with correct is_owner flag (false for added moderators)
 * 4. Proper tracking of who added the moderator (addedBy field)
 * 5. Response structure validation including member, community, and timestamps
 */
export async function test_api_moderator_assignment_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Step 2: Create target member account (to be added as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // Step 3: Create community with owner (owner becomes automatic moderator)
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 4: Add the second member as moderator (using owner connection)
  const moderatorAssignment =
    await api.functional.redditClone.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCloneModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // Step 5: Validate moderator assignment response
  TestValidator.equals(
    "is_owner should be false for added moderator",
    moderatorAssignment.is_owner,
    false,
  );
  TestValidator.equals(
    "member should match added moderator",
    moderatorAssignment.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "community should match target community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "addedBy should reference community owner",
    moderatorAssignment.addedBy?.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "created_at should be valid date-time",
    () =>
      new Date(moderatorAssignment.created_at).getTime() > 0 &&
      new Date(moderatorAssignment.created_at).getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "updated_at should be valid date-time",
    () =>
      new Date(moderatorAssignment.updated_at).getTime() > 0 &&
      new Date(moderatorAssignment.updated_at).getTime() <= Date.now(),
  );
  TestValidator.equals(
    "deleted_at should be null for active assignment",
    moderatorAssignment.deleted_at,
    null,
  );
  TestValidator.equals(
    "moderator username matches",
    moderatorAssignment.member.username,
    moderatorAuth.username,
  );
  TestValidator.equals(
    "community name matches",
    moderatorAssignment.community.name,
    community.name,
  );
}
