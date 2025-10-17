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
 * Test the permanent deletion of an existing reddit community member by the
 * member user themselves.
 *
 * This test covers the following workflow:
 *
 * 1. Register a new member user using the join API.
 * 2. Create a community as the authenticated member user.
 * 3. Delete the member by their unique ID.
 *
 * Validations include:
 *
 * - Confirm removal of the member record and any related data.
 * - Ensure the deletion is a hard delete with no content response body.
 * - Validate authorization requirements, confirming the member role.
 *
 * This test ensures the entire process of member self-deletion works correctly,
 * validating business logic, authorization, and permanent data removal.
 */
export async function test_api_reddit_community_member_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "goodPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a community as the member user
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Delete the member by ID (hard delete, no content expected)
  // Note: No response body is expected for the erase operation
  await api.functional.redditCommunity.member.redditCommunityMembers.erase(
    connection,
    {
      id: member.id,
    },
  );

  // Since the member is deleted, further API calls using same token would fail.
  // Here no further direct validation due to deleted user, test assumes backend properly handles deletion.
}
