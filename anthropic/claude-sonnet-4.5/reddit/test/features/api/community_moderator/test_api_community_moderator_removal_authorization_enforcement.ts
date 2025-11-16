import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that only community owners or administrators can remove moderators.
 *
 * This test validates the authorization hierarchy for moderator removal
 * operations. Regular moderators should NOT be able to remove other moderators
 *
 * - Only the community creator (owner) or platform administrators have this
 *   privilege.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as community creator moderator
 * 2. Create a new community (creator becomes first moderator automatically)
 * 3. Create two moderator accounts to be appointed
 * 4. Appoint both as moderators to the community
 * 5. Switch authentication to second moderator (regular moderator)
 * 6. Attempt to remove third moderator
 * 7. Verify operation fails with 403 Forbidden
 */
export async function test_api_community_moderator_removal_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as community creator moderator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = "SecurePass123!";
  const creatorNickname = RandomGenerator.name();

  const creator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      nickname: creatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(creator);

  // Step 2: Create a community (creator is automatically the first moderator)
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

  // Step 3: Create second moderator account to be appointed
  const mod2Email = typia.random<string & tags.Format<"email">>();
  const mod2Password = "ModPass123!";
  const mod2Nickname = RandomGenerator.name();

  const secondModAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: mod2Email,
        password: mod2Password,
        nickname: mod2Nickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(secondModAccount);

  // Step 4: Create third moderator account to be appointed
  const mod3Email = typia.random<string & tags.Format<"email">>();
  const mod3Password = "ModPass456!";
  const mod3Nickname = RandomGenerator.name();

  const thirdModAccount = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod3Email,
      password: mod3Password,
      nickname: mod3Nickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(thirdModAccount);

  // Step 5: Switch back to creator to appoint second moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const secondModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: communityName,
        body: {
          email: mod2Email,
          password: mod2Password,
          nickname: mod2Nickname,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModerator);

  // Step 6: Appoint third moderator
  const thirdModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: communityName,
        body: {
          email: mod3Email,
          password: mod3Password,
          nickname: mod3Nickname,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(thirdModerator);

  // Step 7: Switch authentication to second moderator (regular moderator, not owner)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod2Email,
      password: mod2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 8: Attempt to remove third moderator and verify 403 Forbidden
  await TestValidator.error(
    "regular moderator cannot remove other moderators",
    async () => {
      await api.functional.redditCommunity.moderator.communities.moderators.erase(
        connection,
        {
          communityName: communityName,
          username: thirdModerator.username,
        },
      );
    },
  );
}
