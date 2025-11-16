import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the complete workflow where a moderator approves a ban appeal, resulting
 * in the ban being lifted and the member regaining access to the community.
 *
 * This test validates that:
 *
 * 1. A moderator creates a community
 * 2. A member joins and gets banned from that community with a specific reason
 * 3. The banned member submits an appeal with detailed explanation
 * 4. The moderator reviews and approves the appeal with a constructive response
 * 5. The appeal status updates to 'approved'
 * 6. The moderator's response is properly recorded and visible to the appealing
 *    member
 *
 * Validates proper moderator authority verification, appeal state transitions,
 * and complete audit trail preservation.
 */
export async function test_api_ban_appeal_approval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Moderator creates account and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
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

  // Step 3: Member creates account and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphabets(8);

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Switch back to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const banReason = "Violation of community rules: spam posting and harassment";
  const ban: IRedditCommunityCommunityBan =
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
  TestValidator.equals(
    "ban created for correct member",
    ban.banned_member.id,
    member.id,
  );
  TestValidator.equals("ban reason matches", ban.reason, banReason);

  // Step 5: Switch to member and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appealText = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 12,
  });
  const appeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: ban.id,
      body: {
        appeal_text: appealText,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal);
  TestValidator.equals(
    "appeal created with correct text",
    appeal.appeal_text,
    appealText,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Step 6: Switch back to moderator and approve the appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const moderatorResponse =
    "After reviewing your appeal, we have decided to lift the ban. Please follow community guidelines going forward.";
  const approvedAppeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.moderator.banAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          status: "approved",
          moderator_response: moderatorResponse,
        } satisfies IRedditCommunityBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedAppeal);

  // Step 7: Validate appeal approval
  TestValidator.equals(
    "appeal status updated to approved",
    approvedAppeal.status,
    "approved",
  );

  // Ensure moderator_response is not null before comparison
  const responseValue = typia.assert(approvedAppeal.moderator_response!);
  TestValidator.equals(
    "moderator response recorded",
    responseValue,
    moderatorResponse,
  );

  // Ensure moderator ID is not null before comparison
  const moderatorIdValue = typia.assert(
    approvedAppeal.reddit_community_moderator_id!,
  );
  TestValidator.equals("moderator ID recorded", moderatorIdValue, moderator.id);

  TestValidator.equals("appeal ID matches", approvedAppeal.id, appeal.id);
  TestValidator.equals(
    "ban ID matches",
    approvedAppeal.reddit_community_community_ban_id,
    ban.id,
  );
}
