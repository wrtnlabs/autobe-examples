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
 * Test that a community owner cannot remove themselves as the owner moderator.
 *
 * This test verifies the business rule that the community owner cannot be
 * removed as a moderator, even by themselves. The owner role is permanent
 * and ensures the community always has an administrative authority.
 */
export async function test_api_community_moderator_removal_owner_cannot_remove_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the community owner
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
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community as owner - this automatically creates owner moderator assignment
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Attempt to remove the owner as moderator (should fail with 403)
  // The owner's moderator assignment ID is not directly available, but we can
  // attempt to remove the owner from the community using their member ID
  await TestValidator.httpError(
    "owner cannot remove themselves as moderator",
    403,
    async () => {
      await api.functional.redditClone.member.communities.moderators.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderatorId: ownerAuth.id,
        },
      );
    },
  );
  // 4. Verify the owner still has moderation privileges by attempting to add another moderator
  // First, register a second member to add as moderator
  const modConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_member_join(modConnection, {
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
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(modAuth);
  // Owner should still be able to add moderators (proving they still have owner privileges)
  const newModerator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: modAuth.id,
          role: "mod",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  typia.assert(newModerator);
  // 5. Validate that the new moderator was added successfully
  TestValidator.equals("moderator role is mod", newModerator.role, "mod");
  TestValidator.equals(
    "moderator member matches",
    newModerator.member.id,
    modAuth.id,
  );
  TestValidator.equals(
    "moderator community matches",
    newModerator.community.id,
    community.id,
  );
  TestValidator.predicate(
    "moderator assignment is active",
    newModerator.deleted_at === null,
  );
}
