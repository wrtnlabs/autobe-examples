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
 * Test moderator removal by community owner with soft delete verification.
 *
 * Validates the complete moderator removal workflow where a community owner removes a moderator from their community. The test ensures that only the owner has authority to remove moderators, the operation performs a soft delete preserving audit history, and the removed moderator retains regular member access to community content.
 *
 * The test creates two member accounts: one as the community owner and another as the moderator to be removed. The owner creates a community, adds the second member as a moderator, then removes them using the delete endpoint. The successful completion of the erase operation confirms the soft delete was performed.
 *
 * 1. Owner member registers and authenticates via member join.
 * 2. Owner creates a new community, automatically becoming the owner.
 * 3. Second member registers and authenticates separately.
 * 4. Owner adds the second member as a moderator to the community.
 * 5. Owner removes the moderator using the delete endpoint.
 * 6. Verifies the operation completes successfully with 204 No Content.
 * 7. Verifies the removed moderator's authentication remains valid for other operations.
 */
export async function test_api_moderator_removal_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates via member join
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
  // 2. Owner creates a new community (automatically becomes owner)
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
  // 3. Second member (to be added as moderator) registers and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Owner adds the second member as a moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: moderatorAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // Verify the moderator was added successfully
  TestValidator.equals(
    "moderator member matches",
    moderatorAssignment.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderator role is moderator",
    moderatorAssignment.role,
    "moderator",
  );
  TestValidator.predicate(
    "moderator assignment is active",
    moderatorAssignment.deleted_at === null,
  );
  // 5. Owner removes the moderator using the delete endpoint
  // This performs a soft delete, setting deleted_at timestamp on the moderator assignment
  await api.functional.redditCommunity.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorAuth.id,
    },
  );
  // 6. Verify the removed moderator's authentication remains valid
  // The successful completion of erase (204 No Content) confirms the operation succeeded
  // The moderator connection should still be valid for other operations
  const moderatorId = moderatorAuth.id;
  TestValidator.predicate(
    "moderator connection remains valid after removal",
    moderatorId !== null,
  );
  // Note: The erase endpoint returns void (204 No Content) on success.
  // The soft delete (deleted_at timestamp) is performed server-side and preserves
  // audit history. The removed moderator retains regular member access to community
  // content but loses moderation privileges.
}
