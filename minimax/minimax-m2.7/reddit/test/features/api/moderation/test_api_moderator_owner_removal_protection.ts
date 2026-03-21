import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";

/**
 * Test that the community owner cannot be removed from the moderator list - owner role is protected.
 *
 * Prerequisites:
 * 1. Register member A (will become community owner)
 * 2. Owner creates a community
 * 3. Owner is appointed as moderator of the community
 *
 * Test execution:
 * - Authenticate as owner (member A)
 * - Send DELETE request to /communities/{communityName}/moderators/{moderatorId}
 * - The moderatorId should be the owner's own UUID (member A's ID)
 *
 * Expected behavior:
 * - Returns 400 Bad Request with message indicating the owner cannot be removed
 * - Owner retains full ownership and moderation authority
 * - No changes to moderator assignment records
 */
export async function test_api_moderator_owner_removal_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (will become community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  // 3. Owner is appointed as moderator of the community
  await generate_random_reddit_clone_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { memberUsername: owner.username },
    },
  );
  // Test: Owner attempts to remove themselves from moderator list
  // Expected: 400 Bad Request - owner cannot be removed
  await TestValidator.httpError(
    "owner cannot remove themselves from moderator list",
    400,
    async () =>
      await api.functional.redditClone.member.communities.moderators.erase(
        ownerConnection,
        {
          communityName: community.name,
          moderatorId: owner.id,
        },
      ),
  );
}
