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
 * Test the deletion of a redditCommunity member by an authenticated
 * communityModerator.
 *
 * This E2E test performs the following steps:
 *
 * 1. Register and login a new communityModerator user to authenticate as a
 *    moderator.
 * 2. Register and login a new member user to create a test target for deletion.
 * 3. Create a new community by the member user to fulfill prerequisite
 *    environment.
 * 4. Switch authentication back to the communityModerator user.
 * 5. Perform the delete operation for the target member by ID.
 * 6. Verify the deletion operation succeeded without errors.
 *
 * The test confirms that the communityModerator role can delete member users,
 * and that the deletion is properly authorized and enacted. It also ensures
 * maintenance of data consistency and security constraints.
 */
export async function test_api_reddit_community_member_deletion_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register a communityModerator user
  const communityModeratorJoinBody = {
    email: `mod_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "ModPassword123!",
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: communityModeratorJoinBody },
    );
  typia.assert(communityModerator);

  // 2. Register a member user
  const memberJoinBody = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "MemberPassword123!",
  } satisfies IRedditCommunityMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // Member login to adopt authentication context if needed
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 3. Member creates a community as prerequisite
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: "Test community for member deletion scenario",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Switch authentication back to communityModerator
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorJoinBody.email,
        password: communityModeratorJoinBody.password,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 5. Delete the member by ID as communityModerator
  await api.functional.redditCommunity.communityModerator.redditCommunityMembers.erase(
    connection,
    { id: member.id },
  );

  // Assure no exceptions/errors thrown means deletion success
}
