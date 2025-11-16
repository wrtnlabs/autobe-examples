import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";

export async function test_api_community_moderator_assignment_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin user and authenticate
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "password123";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create community moderator
  const moderatorEmail = `mod+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const moderatorPassword = "modpass123";
  const moderatorNickname = RandomGenerator.name();
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
          nickname: moderatorNickname,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // 3. Create community moderator assignment
  const communityName = `community_${RandomGenerator.alphaNumeric(5)}`;
  const role = "top_moderator";
  const assignmentCreateBody = {
    community_moderator_id: moderator.id,
    role: role,
  } satisfies IRedditCommunityCommunityModeratorAssignment.ICreate;

  const assignment: IRedditCommunityCommunityModeratorAssignment =
    await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.create(
      connection,
      {
        communityName: communityName,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 4. Retrieve the moderator assignment
  const retrievedAssignment: IRedditCommunityCommunityModeratorAssignment =
    await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.at(
      connection,
      {
        communityName: communityName,
        communityModeratorAssignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);

  // 5. Validate retrieved assignment matches created assignment
  TestValidator.equals(
    "retrieved assignment id matches created",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "retrieved assignment's community_moderator_id matches created",
    retrievedAssignment.community_moderator_id,
    assignment.community_moderator_id,
  );
  TestValidator.equals(
    "retrieved assignment's community_name matches created",
    retrievedAssignment.community_name,
    assignment.community_name,
  );
  TestValidator.equals(
    "retrieved assignment role matches created",
    retrievedAssignment.role,
    assignment.role,
  );
}
