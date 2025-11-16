import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful community ban creation by a moderator.
 *
 * This test validates the complete workflow of a moderator banning a member
 * from a community. It ensures that moderators can successfully create bans
 * with all required information and that the ban immediately takes effect with
 * the correct status and metadata.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community (moderator becomes the creator)
 * 3. Create a member account to be banned
 * 4. Issue a ban against the member with a clear reason
 * 5. Verify ban record has active status and correct references
 */
export async function test_api_community_ban_creation_successful(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member = await api.functional.auth.guest.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Issue the ban (moderator is already authenticated from Step 1)
  const banReason =
    "Repeated violations of community rules and harassment of other members";
  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member.id,
          reason: banReason,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 5: Validate ban record
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals(
    "banned member ID matches",
    ban.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    ban.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    ban.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.predicate(
    "ban has creation timestamp",
    ban.created_at !== null && ban.created_at !== undefined,
  );
  TestValidator.predicate(
    "ban has update timestamp",
    ban.updated_at !== null && ban.updated_at !== undefined,
  );
}
