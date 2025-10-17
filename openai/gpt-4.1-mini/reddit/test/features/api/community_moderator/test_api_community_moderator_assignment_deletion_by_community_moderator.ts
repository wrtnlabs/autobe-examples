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

export async function test_api_community_moderator_assignment_deletion_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a communityModerator user
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorJoinBody = {
    email: communityModeratorEmail,
    password: "password123",
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: communityModeratorJoinBody },
    );
  typia.assert(communityModerator);

  // 2. Register and authenticate a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "password123",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 3. Member user creates a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies IRedditCommunityMember.ILogin,
  });
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphabets(5)}`,
    description: `Description of community owned by ${memberEmail}`,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Register and authenticate an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "password123",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 5. Admin user login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "password123",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 6. Assign the member as community moderator by admin
  const assignModeratorBody = {
    member_id: member.id,
    community_id: community.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: assignModeratorBody,
    },
  );

  // 7. Login as communityModerator user (role switch to communityModerator)
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: "password123",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 8. Delete the community moderator assignment by communityModerator user
  await api.functional.redditCommunity.communityModerator.communities.communityModerators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: member.id,
    },
  );

  // 9. Validate error on repeated deletion attempt
  await TestValidator.error(
    "deleting non-existing community moderator assignment should throw",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.communityModerators.erase(
        connection,
        {
          communityId: community.id,
          moderatorId: member.id,
        },
      );
    },
  );
}
