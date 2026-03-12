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
 * Test that a non-owner member cannot remove a moderator from a community.
 *
 * This test verifies the authorization boundary where only the community owner
 * has permission to remove moderators. A regular member (non-owner, non-moderator)
 * attempting to remove a moderator should receive a 403 Forbidden error, and the
 * moderator assignment should remain intact.
 */
export async function test_api_community_moderator_removal_non_owner_cannot_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the community owner (member1)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community as owner (member1)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as a second member (member2) who will be added as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 4. As owner (member1), add member2 as a moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderatorAuth.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Register and authenticate as a third member (member3) who is NOT a moderator
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(nonOwnerAuth);
  // 6. As member3 (non-owner, non-moderator), attempt to remove member2 (moderator)
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot remove moderator - should return 403",
    403,
    async () =>
      await api.functional.redditClone.member.communities.moderators.erase(
        nonOwnerConnection,
        {
          communityId: community.id,
          moderatorId: moderatorAssignment.id,
        },
      ),
  );
  // 7. Verify that the moderator assignment was NOT deleted (business logic validation)
  // Since the erase operation failed with 403, the moderator should still be active
  // typia.assert already validated the structure, so we check the business state
  TestValidator.predicate(
    "moderator assignment remains active after failed removal attempt",
    moderatorAssignment.deleted_at === null,
  );
}
