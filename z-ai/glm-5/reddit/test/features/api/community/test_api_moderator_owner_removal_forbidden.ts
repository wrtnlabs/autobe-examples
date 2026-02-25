import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test that the community owner cannot be removed from their moderator position.
 *
 * This test validates the business rule that the community owner (is_owner=true)
 * has permanent moderation authority and cannot be removed from their position.
 *
 * Steps:
 * 1. Create and authenticate user A (the future owner)
 * 2. User A creates a community (automatically becomes owner with is_owner=true)
 * 3. Attempt to remove the owner's moderator record
 * 4. Verify the API returns 403 Forbidden
 */
export async function test_api_moderator_owner_removal_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate user A (the future owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: User A creates a community (automatically becomes owner with is_owner=true)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Verify the owner information
  TestValidator.equals("community owner id", community.owner.id, ownerAuth.id);
  // Step 3 & 4: Attempt to remove the owner's moderator record
  // The owner's member ID is used as the moderatorId since upon community creation,
  // a moderator record is automatically created for the creator with is_owner=true
  await TestValidator.httpError(
    "owner cannot be removed from moderator position",
    403,
    async () =>
      await api.functional.community.member.communities.moderators.removeModerator(
        ownerConnection,
        {
          communityName: community.name,
          moderatorId: ownerAuth.id,
        },
      ),
  );
}
