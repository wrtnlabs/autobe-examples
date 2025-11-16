import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test successful assignment of a new moderator to an existing community.
 *
 * This test validates the complete moderator assignment workflow where an
 * authenticated moderator assigns another moderator to their community. The
 * test ensures proper relationship establishment in the community_moderators
 * junction table and verifies the assignment through both direct response
 * validation and moderator list retrieval.
 *
 * Test workflow:
 *
 * 1. Create first moderator account and authenticate (community creator)
 * 2. Create a community (first moderator becomes founding moderator automatically)
 * 3. Create second moderator account (moderator to be assigned)
 * 4. Re-authenticate as first moderator to regain assignment privileges
 * 5. Assign the second moderator to the community
 * 6. Verify the response contains complete moderator assignment record
 * 7. Retrieve the community's moderator list to verify both moderators appear
 */
export async function test_api_moderator_assignment_to_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first moderator (community creator)
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorPassword = RandomGenerator.alphaNumeric(12);
  const firstModeratorNickname = RandomGenerator.name();

  const firstModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: firstModeratorPassword,
        nickname: firstModeratorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Create a community (first moderator becomes founding moderator)
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 4 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create second moderator account (to be assigned)
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModeratorPassword = RandomGenerator.alphaNumeric(12);
  const secondModeratorNickname = RandomGenerator.name();

  const secondModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondModeratorEmail,
        password: secondModeratorPassword,
        nickname: secondModeratorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Step 4: CRITICAL - Re-authenticate as first moderator to regain privileges
  // After creating second moderator, we're authenticated as second moderator
  // Need to switch back to first moderator context for assignment operation
  const firstModeratorReauth: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: firstModeratorPassword,
        nickname: firstModeratorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(firstModeratorReauth);

  // Step 5: Assign second moderator to the community
  // Note: Using ICreate as the API expects full moderator registration data
  const assignmentResponse: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderator.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: secondModeratorEmail,
          password: secondModeratorPassword,
          nickname: secondModeratorNickname,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(assignmentResponse);

  // Step 6: Verify assignment response contains complete moderator record
  TestValidator.predicate(
    "assignment response has valid moderator ID",
    assignmentResponse.id !== undefined && assignmentResponse.id.length > 0,
  );
  TestValidator.equals(
    "assigned moderator email matches",
    assignmentResponse.email,
    secondModeratorEmail,
  );
  TestValidator.predicate(
    "assignment has created_at timestamp",
    assignmentResponse.created_at !== undefined,
  );

  // Step 7: Retrieve community moderator list to verify both moderators
  const moderatorList: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);

  // Step 8: Verify both moderators appear in the list
  TestValidator.predicate(
    "moderator list contains at least 2 moderators",
    moderatorList.data.length >= 2,
  );

  const foundFirstModerator = moderatorList.data.find(
    (mod) => mod.id === firstModerator.id,
  );
  const foundSecondModerator = moderatorList.data.find(
    (mod) => mod.id === secondModerator.id,
  );

  TestValidator.predicate(
    "first moderator (founder) found in community moderator list",
    foundFirstModerator !== undefined,
  );
  TestValidator.predicate(
    "second moderator (assigned) found in community moderator list",
    foundSecondModerator !== undefined,
  );

  if (foundSecondModerator) {
    TestValidator.equals(
      "assigned moderator username in list matches",
      foundSecondModerator.username,
      secondModerator.username,
    );
  }
}
