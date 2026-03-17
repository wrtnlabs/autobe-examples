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
 * Test duplicate moderator assignment rejection.
 *
 * Validates that the system enforces the unique constraint on [community_id, member_id]
 * by rejecting attempts to add a member as moderator when they are already a moderator
 * in the same community.
 *
 * Test Flow:
 * 1. Create owner member account
 * 2. Create target member account (to be added as moderator)
 * 3. Create community with owner
 * 4. Add target member as moderator (should succeed)
 * 5. Attempt to add same member again (should fail with duplicate rejection)
 */
export async function test_api_moderator_assignment_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
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
  // 2. Create target member account (will be added as moderator)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
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
  typia.assert(targetAuth);
  // 3. Create community with owner
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 4. Add target member as moderator (first assignment - should succeed)
  const moderatorAssignment =
    await api.functional.redditClone.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: targetAuth.id,
        } satisfies IRedditCloneModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator member matches",
    moderatorAssignment.member.id,
    targetAuth.id,
  );
  TestValidator.equals(
    "moderator community matches",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.predicate(
    "is not owner",
    moderatorAssignment.is_owner === false,
  );
  // 5. Attempt to add same member as moderator again (should fail - duplicate)
  await TestValidator.error(
    "duplicate moderator assignment rejected",
    async () => {
      await api.functional.redditClone.member.communities.moderators.create(
        ownerConnection,
        {
          communityId: community.id,
          body: {
            member_id: targetAuth.id,
          } satisfies IRedditCloneModerator.ICreate,
        },
      );
    },
  );
}
