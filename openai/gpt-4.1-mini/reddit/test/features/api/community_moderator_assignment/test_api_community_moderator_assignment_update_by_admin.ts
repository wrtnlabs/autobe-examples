import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";

export async function test_api_community_moderator_assignment_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication (join)
  const adminEmail: string =
    RandomGenerator.alphaNumeric(10) + "@admin.example.com";
  const adminPassword = "Password123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a community moderator account
  const modEmail: string =
    RandomGenerator.alphaNumeric(10) + "@moderator.example.com";
  const modPassword = "ModeratorPass123!";
  const communityModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: modEmail,
          password: modPassword,
          nickname: RandomGenerator.name(2),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // Step 3: Create a moderator assignment to be updated
  // Use a realistic communityName string
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(5);
  const initialRole = "moderator";

  const modAssignment: IRedditCommunityCommunityModeratorAssignment =
    await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.create(
      connection,
      {
        communityName,
        body: {
          community_moderator_id: communityModerator.id,
          role: initialRole,
        } satisfies IRedditCommunityCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssignment);

  TestValidator.equals(
    "moderator assignment communityModeratorId matches created moderator",
    modAssignment.community_moderator_id,
    communityModerator.id,
  );
  TestValidator.equals(
    "moderator assignment role is initial role",
    modAssignment.role,
    initialRole,
  );
  TestValidator.equals(
    "moderator assignment communityName matches",
    modAssignment.community_name,
    communityName,
  );

  // Step 4: Update the moderator assignment role
  const updatedRole = "admin";

  const updatedAssignment: IRedditCommunityCommunityModeratorAssignment =
    await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.update(
      connection,
      {
        communityName,
        communityModeratorAssignmentId: modAssignment.id,
        body: {
          role: updatedRole,
          updated_at: new Date().toISOString(), // Include update timestamp as per schema allowing it
        } satisfies IRedditCommunityCommunityModeratorAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);

  TestValidator.equals(
    "updated assignment id matches original",
    updatedAssignment.id,
    modAssignment.id,
  );
  TestValidator.equals(
    "updated assignment role is updated role",
    updatedAssignment.role,
    updatedRole,
  );
  TestValidator.equals(
    "updated assignment communityName remains same",
    updatedAssignment.community_name,
    communityName,
  );
}
