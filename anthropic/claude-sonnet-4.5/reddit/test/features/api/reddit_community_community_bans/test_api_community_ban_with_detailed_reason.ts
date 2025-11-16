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
 * Validates ban creation with comprehensive, specific reasons supporting
 * transparency and appeals.
 *
 * This test ensures that moderators can provide detailed explanations (up to
 * 500 characters) when issuing community bans. The detailed reason field
 * supports:
 *
 * - Clear documentation of specific rule violations
 * - Transparency in moderation decisions
 * - Accountability for enforcement actions
 * - Proper context for potential ban appeals
 *
 * Test workflow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create community with specific enforcement rules
 * 3. Create guest member account for ban testing
 * 4. Issue ban with detailed reason explaining specific violation
 * 5. Verify reason is stored accurately and retrievable
 */
export async function test_api_community_ban_with_detailed_reason(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: testHref,
      referrer: testReferrer,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community with specific rules for enforcement
  const communityName = RandomGenerator.alphabets(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<21>
    >(),
  );
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules:
            "Rule #1: No spam posting. Rule #2: No harassment. Rule #3: Stay on topic.",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create guest member account for ban testing
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = typia.random<string & tags.MinLength<8>>();
  const guestUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<50>
    >(),
  );

  const guest = await api.functional.auth.guest.join(connection, {
    body: {
      username: guestUsername,
      email: guestEmail,
      password: guestPassword,
      href: testHref,
      referrer: testReferrer,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(guest);

  // Step 4: Issue ban with detailed, specific reason
  const detailedReason =
    "Repeated spam posting of promotional links violating rule #1 over the past week. User posted 15+ promotional links to external commerce sites without contributing meaningful discussion. This pattern of behavior disrupts community quality and violates our content guidelines section 1.2 regarding self-promotion limits.";

  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guest.id,
          reason: detailedReason,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 5: Verify ban record properties
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("banned member matches", ban.banned_member.id, guest.id);
  TestValidator.equals(
    "ban moderator matches",
    ban.banned_by_moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "ban reason stored accurately",
    ban.reason,
    detailedReason,
  );
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.predicate(
    "ban reason length within limits",
    ban.reason.length >= 1 && ban.reason.length <= 500,
  );
}
