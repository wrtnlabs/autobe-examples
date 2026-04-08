import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a moderator can create a temporary ban with an expiration date.
 *
 * Validates the temporary ban creation workflow where a moderator restricts a member from creating posts and comments in a community for a specified duration. The test verifies that the ban record is correctly created with the expiration timestamp, and that all related entity information (banned member, banning moderator, community) is properly populated in the response.
 *
 * The temporary ban allows the member to still view content while preventing participation. After the expiration time, the ban automatically becomes inactive and the member regains posting privileges without manual intervention.
 *
 * 1. Register and authenticate a moderator account with email, password, and display name.
 * 2. Register and authenticate a member account that will be temporarily banned.
 * 3. Create a test community (using random UUID since community creation endpoint is not available in SDK).
 * 4. Assign the moderator as owner of the community to grant moderation privileges.
 * 5. Create a temporary ban with a 7-day expiration period.
 * 6. Validate the ban response contains correct data including expiration timestamp, ban reason, and all related entity information.
 */
export async function test_api_community_ban_temporary_with_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "12345678",
      display_name: "Test Moderator",
      bio: "Community moderator for testing",
      href: "https://test.com/moderator/join",
      referrer: "https://test.com/",
    },
  });
  typia.assert(moderator);
  // 2. Register and authenticate member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: "bannedmember@test.com",
      password: "12345678",
      username: "banned_user",
      href: "https://test.com/member/join",
      referrer: "https://test.com/",
    },
  });
  typia.assert(member);
  // 3. Create a test community (using random UUID)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Assign moderator as owner of the community
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: {
          communityId,
        },
        body: {
          userProfileId: moderator.reddit_clone_user_profile_id,
          role: "owner",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Calculate expiration date (7 days from now)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  const expiresAt: string & tags.Format<"date-time"> =
    expirationDate.toISOString();
  // 6. Create temporary ban
  const ban =
    await generate_random_reddit_clone_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId,
        },
        body: {
          reddit_clone_member_id: member.id,
          ban_reason: "Violation of community guidelines - harassment",
          expires_at: expiresAt,
        },
      },
    );
  typia.assert(ban);
  // 7. Validate ban response
  TestValidator.equals(
    "ban reason matches input",
    ban.banReason,
    "Violation of community guidelines - harassment",
  );
  TestValidator.equals("expiration date is set", ban.expiresAt, expiresAt);
  TestValidator.equals(
    "banned member ID matches",
    ban.bannedMember.id,
    member.id,
  );
  TestValidator.equals(
    "banning moderator ID matches",
    ban.banningModerator.id,
    moderator.id,
  );
  TestValidator.equals("community ID matches", ban.community.id, communityId);
  TestValidator.equals("ban is active (not deleted)", ban.deletedAt, null);
  TestValidator.predicate("created at is valid date-time", () => {
    const date = new Date(ban.createdAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated at is valid date-time", () => {
    const date = new Date(ban.updatedAt);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "created and updated timestamps match",
    ban.createdAt,
    ban.updatedAt,
  );
}
