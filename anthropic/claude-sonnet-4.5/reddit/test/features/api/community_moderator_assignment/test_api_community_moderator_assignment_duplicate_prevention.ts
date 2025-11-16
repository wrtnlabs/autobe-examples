import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test duplicate moderator assignment prevention.
 *
 * Validates that the system enforces unique constraint on moderator email when
 * assigning moderators to a community. The API endpoint creates new moderator
 * accounts for the community, so duplicate prevention is based on email
 * uniqueness rather than member-community relationship.
 *
 * Test flow:
 *
 * 1. Create and authenticate moderator account (community creator)
 * 2. Create a community (moderator becomes first moderator)
 * 3. Create member account with specific email
 * 4. Assign new moderator using member's email (should succeed)
 * 5. Attempt to assign another moderator with same email (should fail)
 * 6. Validate error occurs on duplicate email assignment
 */
export async function test_api_community_moderator_assignment_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator (community creator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: null,
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">
  >();
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.name(1);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://test.example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 5: Assign new moderator using member's email (first time - should succeed)
  // Note: This endpoint creates a NEW moderator account for the community using the provided email
  const firstAssignment =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: memberEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          nickname: RandomGenerator.name(),
          ip: null,
          href: "https://test.example.com/community/moderator/assign" satisfies string &
            tags.Format<"uri">,
          referrer: "" satisfies string & tags.Format<"uri">,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAssignment);

  // Validate first assignment succeeded
  TestValidator.equals(
    "assigned moderator email matches",
    firstAssignment.email,
    memberEmail,
  );

  // Step 6: Attempt duplicate assignment with same email (should fail)
  // The unique constraint on email should prevent creating another moderator with the same email
  await TestValidator.error(
    "duplicate moderator assignment with same email should fail",
    async () => {
      await api.functional.redditCommunity.communities.moderators.create(
        connection,
        {
          communityName: community.name,
          body: {
            email: memberEmail,
            password: typia.random<string & tags.MinLength<8>>(),
            nickname: RandomGenerator.name(),
            ip: null,
            href: "https://test.example.com/community/moderator/assign" satisfies string &
              tags.Format<"uri">,
            referrer: "" satisfies string & tags.Format<"uri">,
          } satisfies IRedditCommunityCommunityModerator.ICreate,
        },
      );
    },
  );
}
