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
 * Test pagination functionality when retrieving moderators for a community with
 * multiple moderators.
 *
 * This test validates proper page size limits, page navigation, and sorting
 * capabilities for communities with large moderation teams. It ensures
 * pagination metadata is accurate and different pages return distinct moderator
 * sets.
 *
 * Test workflow:
 *
 * 1. Create first moderator account and authenticate
 * 2. Create a community
 * 3. Create multiple additional moderator accounts (4 more)
 * 4. Assign all additional moderators to the community
 * 5. Retrieve moderator list with pagination parameters (page=1, limit=2)
 * 6. Validate that exactly 2 moderators are returned
 * 7. Retrieve the next page (page=2, limit=2)
 * 8. Verify different moderators are returned
 * 9. Validate pagination metadata (total records, total pages, current page)
 * 10. Test edge cases like requesting beyond last page
 */
export async function test_api_community_moderators_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account and authenticate
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorPassword = "SecurePass123!";
  const firstModeratorNickname = RandomGenerator.name();

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: firstModeratorEmail,
      password: firstModeratorPassword,
      nickname: firstModeratorNickname,
      href: "https://test.example.com/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Step 2: Create a community (first moderator is automatically the founding moderator)
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3 & 4: Create 4 additional moderator accounts and assign them to the community
  const additionalModeratorCredentials: Array<{
    email: string;
    password: string;
    nickname: string;
  }> = [];

  for (let i = 0; i < 4; i++) {
    const moderatorEmail = typia.random<string & tags.Format<"email">>();
    const moderatorPassword = "SecurePass123!";
    const moderatorNickname = RandomGenerator.name();

    additionalModeratorCredentials.push({
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
    });

    // Create the moderator account
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: "https://test.example.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
    typia.assert(moderator);
  }

  // Restore first moderator's authentication to assign the additional moderators
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: firstModeratorEmail,
      password: firstModeratorPassword,
      nickname: firstModeratorNickname,
      href: "https://test.example.com/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });

  // Assign all additional moderators to the community
  for (const credentials of additionalModeratorCredentials) {
    const assignment =
      await api.functional.redditCommunity.moderator.communities.moderators.create(
        connection,
        {
          communityName: community.name,
          body: {
            email: credentials.email,
            password: credentials.password,
            nickname: credentials.nickname,
            href: "https://test.example.com/moderator" satisfies string &
              tags.Format<"uri">,
            referrer: "" satisfies string & tags.Format<"uri">,
          } satisfies IRedditCommunityCommunityModerator.ICreate,
        },
      );
    typia.assert(assignment);
  }

  // Step 5: Retrieve moderator list with pagination (page=1, limit=2)
  const page1Result =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Result);

  // Step 6: Validate that exactly 2 moderators are returned
  TestValidator.equals(
    "page 1 should return exactly 2 moderators",
    page1Result.data.length,
    2,
  );

  // Step 7: Validate pagination metadata for page 1
  TestValidator.equals(
    "total moderators should be 5",
    page1Result.pagination.records,
    5,
  );
  TestValidator.equals(
    "total pages should be 3",
    page1Result.pagination.pages,
    3,
  );
  TestValidator.equals(
    "current page should be 0 (zero-indexed)",
    page1Result.pagination.current,
    0,
  );
  TestValidator.equals("limit should be 2", page1Result.pagination.limit, 2);

  // Step 8: Retrieve the next page (page=2, limit=2)
  const page2Result =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(page2Result);

  // Step 9: Verify different moderators are returned on page 2
  TestValidator.equals(
    "page 2 should return exactly 2 moderators",
    page2Result.data.length,
    2,
  );
  TestValidator.equals(
    "current page should be 1 (zero-indexed)",
    page2Result.pagination.current,
    1,
  );

  const page1Ids = page1Result.data.map((m) => m.id);
  const page2Ids = page2Result.data.map((m) => m.id);

  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 should have different moderators",
    !hasOverlap,
  );

  // Step 10: Retrieve page 3 (should get 1 moderator - the last one)
  const page3Result =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(page3Result);

  TestValidator.equals(
    "page 3 should return exactly 1 moderator",
    page3Result.data.length,
    1,
  );
  TestValidator.equals(
    "current page should be 2 (zero-indexed)",
    page3Result.pagination.current,
    2,
  );

  // Step 11: Test edge case - request beyond last page
  const beyondLastPageResult =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(beyondLastPageResult);

  TestValidator.equals(
    "requesting beyond last page should return 0 moderators",
    beyondLastPageResult.data.length,
    0,
  );
}
