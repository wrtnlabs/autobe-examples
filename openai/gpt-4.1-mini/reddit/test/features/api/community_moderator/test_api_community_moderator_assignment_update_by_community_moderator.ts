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
import type { IRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerators";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validate that a community moderator user can update the assignment of a
 * community moderator record within the community.
 *
 * The test performs the following steps:
 *
 * 1. Authenticate a member user.
 * 2. Authenticate an admin user.
 * 3. Authenticate a community moderator user.
 * 4. Use the member user to create a community.
 * 5. Use the admin user to assign the community moderator to the community.
 * 6. Use the community moderator user to update the moderator assignment, changing
 *    assignment timestamps.
 * 7. Assert that the returned updated record matches the update request and
 *    existing IDs.
 *
 * This validates role-based access control, proper data persistence, and
 * correct API behavior for updates executed by community moderators.
 *
 * @param connection The API connection.
 */
export async function test_api_community_moderator_assignment_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testing1234",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "testing1234",
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Authenticate as community moderator
  const cmEmail = typia.random<string & tags.Format<"email">>();
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: cmEmail,
          password: "testing1234",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(communityModerator);

  // 4. Member creates a community
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: "Test community for moderator update",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Admin assigns the community moderator to the community
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        member_id: communityModerator.id,
        community_id: community.id,
        assigned_at: new Date().toISOString(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 6. Community moderator updates the assignment
  const updatedAssignedAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const randomModeratorAssignmentId = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateData = {
    id: randomModeratorAssignmentId,
    member_id: communityModerator.id,
    community_id: community.id,
    assigned_at: updatedAssignedAt,
  } satisfies IRedditCommunityCommunityModerators.IUpdate;

  const updatedModerator =
    await api.functional.redditCommunity.communityModerator.communities.communityModerators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: randomModeratorAssignmentId,
        body: updateData,
      },
    );
  typia.assert(updatedModerator);

  // 7. Assert the update
  TestValidator.equals(
    "updated moderator assignment id",
    updatedModerator.id,
    updateData.id,
  );
  TestValidator.equals(
    "updated moderator member_id",
    updatedModerator.member_id,
    updateData.member_id,
  );
  TestValidator.equals(
    "updated moderator community_id",
    updatedModerator.community_id,
    updateData.community_id,
  );
  TestValidator.equals(
    "updated assigned_at",
    updatedModerator.assigned_at,
    updateData.assigned_at,
  );
}
