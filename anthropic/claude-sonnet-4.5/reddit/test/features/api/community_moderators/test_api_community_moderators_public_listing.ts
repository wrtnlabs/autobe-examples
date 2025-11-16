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
 * Test that the public can retrieve a paginated list of moderators for a
 * specific community without authentication.
 *
 * This test validates community transparency by allowing anyone to see who
 * moderates a community, supporting platform accountability principles.
 *
 * Test workflow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Create a community (moderator becomes first moderator automatically)
 * 3. Retrieve the moderator list for the community without authentication
 * 4. Validate that the response contains the moderator who created the community
 * 5. Verify pagination metadata is correct
 * 6. Confirm moderator summary information includes essential fields (username,
 *    karma, avatar, etc.)
 */
export async function test_api_community_moderators_public_listing(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account and authenticate
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community (moderator becomes first moderator automatically)
  const communityName = RandomGenerator.alphabets(10);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Verify community was created with correct name
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Retrieve the moderator list for the community WITHOUT authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const requestBody = {
    page: 1,
    limit: 10,
    sort: "assigned_at_desc" as const,
  } satisfies IRedditCommunityCommunityModerator.IRequest;

  const moderatorList: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      unauthenticatedConnection,
      {
        communityName: community.name,
        body: requestBody,
      },
    );
  typia.assert(moderatorList);

  // Step 4: Validate that the response contains the moderator who created the community
  TestValidator.predicate(
    "moderator list contains at least one moderator",
    moderatorList.data.length >= 1,
  );

  const foundModerator = moderatorList.data.find(
    (mod) => mod.username === moderator.username,
  );
  typia.assertGuard(foundModerator!);

  TestValidator.equals(
    "founding moderator is in the list",
    foundModerator.username,
    moderator.username,
  );

  // Step 5: Verify pagination metadata is correct
  TestValidator.equals(
    "current page index is 0",
    moderatorList.pagination.current,
    0,
  );
  TestValidator.equals("page limit is 10", moderatorList.pagination.limit, 10);
  TestValidator.predicate(
    "total records is at least 1",
    moderatorList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    moderatorList.pagination.pages >= 1,
  );
}
