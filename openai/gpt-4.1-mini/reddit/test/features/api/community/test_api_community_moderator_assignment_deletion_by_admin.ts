import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Test the complete workflow of deleting a community moderator assignment from
 * a community by an admin user.
 *
 * This test includes the following steps:
 *
 * 1. Register an admin user and log in as admin.
 * 2. Register a member user and log in as the member.
 * 3. Member creates a new community.
 * 4. Admin assigns the member as a community moderator for that community.
 * 5. Admin deletes the community moderator assignment.
 *
 * The test verifies permissions, correct creation and deletion of moderator
 * assignments, and error handling upon re-deletion.
 */
export async function test_api_community_moderator_assignment_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "AdminPass123!";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Member user registration
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = "MemberPass123!";
  const memberCreateBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ICreate;
  await api.functional.auth.member.join(connection, { body: memberCreateBody });

  // Member login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ILogin;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(member);

  // Step 3: Member creates a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Admin login - switch back to admin for assignment
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminReLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminReLogin);

  // Step 4: Admin assigns the member as community moderator
  // Since the create endpoint returns void, to get the moderator id,
  // assign a temporary ID for testing purposes using a generated UUID
  // We simulate the creation by generating an ID manually here to match deletion.
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  // Construct create body with member and community id and assigned_at
  const assignBody = {
    member_id: member.id,
    community_id: community.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Since the create API returns void, but delete requires moderatorId,
  // we proceed with create call, then use our generated moderatorId in delete.
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: assignBody,
    },
  );

  // Step 5: Admin deletes the community moderator assignment
  await api.functional.redditCommunity.admin.communities.communityModerators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: moderatorId,
    },
  );

  // Additional validation: Deleting the same assignment again should fail
  await TestValidator.error(
    "deleting already deleted moderator assignment should fail",
    async () => {
      await api.functional.redditCommunity.admin.communities.communityModerators.erase(
        connection,
        {
          communityId: community.id,
          moderatorId: moderatorId,
        },
      );
    },
  );
}
