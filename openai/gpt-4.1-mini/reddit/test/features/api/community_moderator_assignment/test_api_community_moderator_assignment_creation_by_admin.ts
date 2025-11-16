import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";

export async function test_api_community_moderator_assignment_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorNickname = RandomGenerator.name();
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: "StrongPass!456",
          nickname: moderatorNickname,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 3: Create a community moderator assignment to a specific community
  const communityName = "testcommunity"; // using a realistic but fixed string as community identifier
  // For the assignment, must supply the moderator id and role
  const assignmentRole = "moderator"; // role can be e.g. 'moderator' or other allowed string

  const assignment: IRedditCommunityCommunityModeratorAssignment =
    await api.functional.redditCommunity.admin.communities.communityModeratorAssignments.create(
      connection,
      {
        communityName,
        body: {
          community_moderator_id: moderator.id,
          role: assignmentRole,
        } satisfies IRedditCommunityCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // Validation: ensure assignment is correctly linked and data matches expectations
  TestValidator.equals(
    "community moderator assignment links correct moderator",
    assignment.community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "community moderator assignment belongs to correct community",
    assignment.community_name,
    communityName,
  );
  TestValidator.equals(
    "community moderator assignment role matches",
    assignment.role,
    assignmentRole,
  );
}
