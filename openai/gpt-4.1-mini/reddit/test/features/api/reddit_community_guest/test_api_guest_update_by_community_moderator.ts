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
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validate that a communityModerator can update a redditCommunityGuest by its
 * unique ID.
 *
 * This test performs an end-to-end flow including:
 *
 * 1. CommunityModerator registration and authentication (join and login).
 * 2. Member registration and authentication (join and login) to create a community
 *    prerequisite.
 * 3. Creating a new redditCommunity community as the member.
 * 4. CommunityModerator login to switch authorization context.
 * 5. Generating a random redditCommunityGuest entity to update.
 * 6. Updating the guest's sessionId, ipAddress, and userAgent fields.
 * 7. Calling the update API and validating the updated guest response.
 *
 * The test asserts that the communityModerator has correct permissions to
 * update guest data, updates are persisted and validated, and all API responses
 * conform to expected DTO types. It uses typia.assert to ensure full type
 * safety and SDK-managed authentication for token handling.
 */
export async function test_api_guest_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register communityModerator user
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorPassword = "securePass123";
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: communityModeratorEmail,
          password: communityModeratorPassword,
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(communityModerator);

  // 2. Register member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPass456";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 3. Member login to obtain authorization
  const loggedInMember = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loggedInMember);

  // 4. Create a new redditCommunity community as the member
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community name should be non-empty",
    typeof community.name === "string" && community.name.length > 0,
  );

  // 5. CommunityModerator login to switch authorization
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: communityModeratorPassword,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 6. Generate a random redditCommunityGuest entity's ID and update data
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    session_id: RandomGenerator.alphaNumeric(12),
    ip_address: `${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(3)}`,
    user_agent: `Mozilla/5.0 (${RandomGenerator.name(2)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RandomGenerator.alphaNumeric(2)}.0.0.0 Safari/537.36`,
  } satisfies IRedditCommunityGuest.IUpdate;

  // 7. Call update API for the guest
  const updatedGuest =
    await api.functional.redditCommunity.communityModerator.redditCommunityGuests.update(
      connection,
      {
        id: guestId,
        body: updateBody,
      },
    );
  typia.assert(updatedGuest);

  // 8. Validate updated data
  TestValidator.equals(
    "updated session_id matches",
    updatedGuest.session_id,
    updateBody.session_id,
  );
  TestValidator.equals(
    "updated ip_address matches",
    updatedGuest.ip_address,
    updateBody.ip_address,
  );
  TestValidator.equals(
    "updated user_agent matches",
    updatedGuest.user_agent,
    updateBody.user_agent,
  );
}
