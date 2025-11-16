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
 * Test moderator list retrieval for a newly created community with only the
 * creator as moderator.
 *
 * This test validates the baseline scenario where a community has only its
 * founding moderator. When a moderator creates a new community, they
 * automatically become the first and only moderator. The test verifies that the
 * moderator list endpoint correctly returns exactly one moderator entry with
 * accurate pagination metadata.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community (creator becomes first and only moderator)
 * 3. Retrieve moderator list for the community
 * 4. Verify that exactly one moderator is returned (the creator)
 * 5. Validate pagination shows total records = 1, total pages = 1
 * 6. Confirm the returned moderator matches the creator's details
 */
export async function test_api_community_moderators_empty_list(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const moderatorCreateData = {
    email: moderatorEmail,
    password: moderatorPassword,
    nickname: moderatorNickname,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const authenticatedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create a community (creator becomes first and only moderator)
  const communityName = RandomGenerator.alphabets(10);
  const communityDisplayTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const communityRules = RandomGenerator.paragraph({ sentences: 2 });

  const communityCreateData = {
    name: communityName,
    display_title: communityDisplayTitle,
    description: communityDescription,
    rules: communityRules,
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityCreateData,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Retrieve moderator list for the community
  const moderatorListRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityModerator.IRequest;

  const moderatorListResponse: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: createdCommunity.name,
        body: moderatorListRequest,
      },
    );
  typia.assert(moderatorListResponse);

  // Step 4: Verify that exactly one moderator is returned (the creator)
  TestValidator.equals(
    "moderator list should contain exactly one moderator",
    moderatorListResponse.data.length,
    1,
  );

  // Step 5: Validate pagination shows total records = 1, total pages = 1
  TestValidator.equals(
    "pagination total records should be 1",
    moderatorListResponse.pagination.records,
    1,
  );

  TestValidator.equals(
    "pagination total pages should be 1",
    moderatorListResponse.pagination.pages,
    1,
  );

  TestValidator.equals(
    "pagination current page should be 0",
    moderatorListResponse.pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit should match request",
    moderatorListResponse.pagination.limit,
    10,
  );

  // Step 6: Confirm the returned moderator matches the creator's details
  const returnedModerator = moderatorListResponse.data[0];
  typia.assert(returnedModerator);

  TestValidator.equals(
    "returned moderator ID should match creator ID",
    returnedModerator.id,
    authenticatedModerator.id,
  );

  TestValidator.equals(
    "returned moderator username should match creator username",
    returnedModerator.username,
    authenticatedModerator.username,
  );
}
