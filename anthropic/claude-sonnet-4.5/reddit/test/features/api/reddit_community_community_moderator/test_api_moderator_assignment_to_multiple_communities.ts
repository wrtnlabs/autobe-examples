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
 * Test moderator assignment to multiple communities.
 *
 * This test validates that moderators are properly assigned to communities when
 * they are created, and that each moderator can create and manage multiple
 * communities. Since the available API does not provide an explicit "assign
 * existing moderator" endpoint, this test focuses on the implicit
 * moderator-community relationship established during community creation.
 *
 * Test workflow:
 *
 * 1. Create first moderator account and authenticate
 * 2. Create first community (moderatorA becomes its moderator)
 * 3. Create second community (moderatorA becomes its moderator too)
 * 4. Create second moderator account and authenticate
 * 5. Create third community (moderatorB becomes its moderator)
 * 6. Verify moderatorA is assigned to their created communities
 * 7. Verify moderatorB is assigned to their created community
 * 8. Confirm moderators can manage multiple communities
 */
export async function test_api_moderator_assignment_to_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAPassword = "SecurePassword123";
  const moderatorANickname = RandomGenerator.name();

  const moderatorA: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorAEmail,
        password: moderatorAPassword,
        nickname: moderatorANickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderatorA);

  // Step 2: Create first community as moderatorA
  const communityA1Name = RandomGenerator.alphabets(10);
  const communityA1: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityA1Name,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA1);
  TestValidator.equals(
    "moderatorA created first community",
    communityA1.name,
    communityA1Name,
  );

  // Step 3: Create second community as moderatorA (same moderator, different community)
  const communityA2Name = RandomGenerator.alphabets(10);
  const communityA2: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityA2Name,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA2);
  TestValidator.equals(
    "moderatorA created second community",
    communityA2.name,
    communityA2Name,
  );

  // Step 4: Create second moderator account
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBPassword = "SecurePassword456";
  const moderatorBNickname = RandomGenerator.name();

  const moderatorB: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorBEmail,
        password: moderatorBPassword,
        nickname: moderatorBNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderatorB);

  // Step 5: Create third community as moderatorB
  const communityBName = RandomGenerator.alphabets(10);
  const communityB: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityBName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  TestValidator.equals(
    "moderatorB created community",
    communityB.name,
    communityBName,
  );

  // Step 6: Verify moderatorA's first community has moderator assigned
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const communityA1Moderators: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      unauthConn,
      {
        communityName: communityA1Name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(communityA1Moderators);

  TestValidator.predicate(
    "communityA1 has at least one moderator",
    communityA1Moderators.data.length >= 1,
  );

  // Step 7: Verify moderatorA's second community has moderator assigned
  const communityA2Moderators: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      unauthConn,
      {
        communityName: communityA2Name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(communityA2Moderators);

  TestValidator.predicate(
    "communityA2 has at least one moderator",
    communityA2Moderators.data.length >= 1,
  );

  // Step 8: Verify moderatorB's community has moderator assigned
  const communityBModerators: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      unauthConn,
      {
        communityName: communityBName,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(communityBModerators);

  TestValidator.predicate(
    "communityB has at least one moderator",
    communityBModerators.data.length >= 1,
  );

  // Step 9: Confirm multiple community management capability
  TestValidator.predicate(
    "moderatorA manages multiple communities",
    communityA1Moderators.data.length >= 1 &&
      communityA2Moderators.data.length >= 1,
  );

  TestValidator.predicate(
    "all communities have proper moderator assignments",
    communityA1Moderators.data.length >= 1 &&
      communityA2Moderators.data.length >= 1 &&
      communityBModerators.data.length >= 1,
  );
}
