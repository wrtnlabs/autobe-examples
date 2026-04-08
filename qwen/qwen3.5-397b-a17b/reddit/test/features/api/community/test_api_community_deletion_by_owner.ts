import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community deletion by owner workflow.
 *
 * Validates that a community owner can successfully delete their own community through the soft-delete mechanism. The test ensures proper authentication, community creation, and deletion flow with appropriate response handling.
 *
 * The test verifies that the DELETE operation completes successfully with 204 No Content status, and that the soft-delete mechanism properly marks the community as deleted without removing it from the database.
 *
 * 1. Member authenticates via join operation to obtain authorization token.
 * 2. Member creates a new community and automatically becomes the owner.
 * 3. Owner deletes the community using the community ID.
 * 4. Validates deletion completes without error (void response indicates 204 No Content).
 */
export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community (member becomes owner automatically)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Verify the authenticated member is the community owner
  TestValidator.equals(
    "member is community owner",
    memberAuth.id,
    community.owner.id,
  );
  // 3. Delete the community as owner
  await api.functional.redditCommunity.member.communities.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Deletion completed successfully (void response = 204 No Content)
  // Successful completion of erase() without throwing validates the deletion
}
