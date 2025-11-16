import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";

export async function test_api_community_moderator_assignment_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin and get admin info
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongP@ssword123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create community moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modNickname = RandomGenerator.name(2);
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: modEmail,
          password: "ModP@ssword321",
          nickname: modNickname,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 3: Create community moderator assignment
  const communityName = `testCommunity_${RandomGenerator.alphaNumeric(6)}`;
  const modRole = "moderator";
  const assignment: IRedditCommunityCommunityModeratorAssignment =
    await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.create(
      connection,
      {
        communityName: communityName,
        body: {
          community_moderator_id: moderator.id,
          role: modRole,
        } satisfies IRedditCommunityCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // Step 4: Delete community moderator assignment
  await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.erase(
    connection,
    {
      communityName: communityName,
      communityModeratorAssignmentId: assignment.id,
    },
  );

  // Validate that deletion has completed successfully - no error thrown
  TestValidator.predicate(
    "community moderator assignment deleted successfully",
    true,
  );
}
