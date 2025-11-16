import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that an existing appointed moderator can assign additional moderators to
 * the community.
 *
 * This test validates the moderator hierarchy and delegation of moderation
 * authority. It creates a community with the original creator moderator, then
 * the creator appoints a second moderator, and finally that second moderator
 * appoints a third moderator.
 *
 * Steps:
 *
 * 1. Create and authenticate as the community creator (moderator 1)
 * 2. Create a community (creator becomes first moderator automatically)
 * 3. As creator, create a second moderator account and assign to the community
 * 4. Switch authentication to moderator 2 (the appointed moderator)
 * 5. As moderator 2, create and assign a third moderator to the community
 * 6. Validate that all moderator assignments succeeded
 */
export async function test_api_community_moderator_assignment_by_existing_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as the community creator (moderator 1)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = typia.random<string & tags.MinLength<8>>();

  const creator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(creator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(15);

  const community =
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

  // Step 3: As creator, create second moderator and assign to the community
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = typia.random<string & tags.MinLength<8>>();

  const moderator2 =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: moderator2Email,
          password: moderator2Password,
          nickname: RandomGenerator.name(),
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator2);

  // Step 4: Switch authentication to moderator 2
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 5: As moderator 2, create and assign third moderator to the community
  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3Password = typia.random<string & tags.MinLength<8>>();

  const moderator3 =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: moderator3Email,
          password: moderator3Password,
          nickname: RandomGenerator.name(),
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator3);

  // Step 6: Validate the results
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "creator is the community creator",
    community.creator_member_id,
    creator.id,
  );
  TestValidator.predicate("moderator 2 has valid ID", moderator2.id.length > 0);
  TestValidator.predicate("moderator 3 has valid ID", moderator3.id.length > 0);
  TestValidator.predicate(
    "moderator 2 email matches",
    moderator2.email === moderator2Email,
  );
  TestValidator.predicate(
    "moderator 3 email matches",
    moderator3.email === moderator3Email,
  );
}
