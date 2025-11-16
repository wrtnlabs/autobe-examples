import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test converting a temporary ban to a permanent ban by updating expires_at to
 * null.
 *
 * This test validates the ban escalation workflow where moderators determine
 * that a time-limited ban should become indefinite due to severity or repeated
 * violations.
 *
 * Steps:
 *
 * 1. Authenticate as moderator
 * 2. Create a community for ban management
 * 3. Create a temporary ban with an expiration timestamp
 * 4. Update the ban to set expires_at to null (permanent)
 * 5. Verify the ban is now permanent with no expiration date
 */
export async function test_api_community_ban_permanent_conversion(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community for ban escalation workflow
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

  // Step 3: Create a temporary ban with expiration timestamp
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expirationDate = futureDate.toISOString();

  const temporaryBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: communityName,
        body: {
          banned_member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Initial violation - temporary ban for review",
          expires_at: expirationDate,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(temporaryBan);

  // Verify initial ban has expiration date
  TestValidator.predicate(
    "temporary ban should have expiration date",
    temporaryBan.expires_at !== null && temporaryBan.expires_at !== undefined,
  );
  TestValidator.equals(
    "initial ban expiration matches",
    temporaryBan.expires_at,
    expirationDate,
  );

  // Step 4: Convert temporary ban to permanent by setting expires_at to null
  const permanentBan: IRedditCommunityBan =
    await api.functional.redditCommunity.moderator.bans.update(connection, {
      banId: temporaryBan.id,
      body: {
        expires_at: null,
      } satisfies IRedditCommunityBan.IUpdate,
    });
  typia.assert(permanentBan);

  // Step 5: Verify ban is now permanent (expires_at is null)
  TestValidator.equals(
    "ban converted to permanent - expires_at should be null",
    permanentBan.expires_at,
    null,
  );

  TestValidator.equals(
    "ban status should remain active",
    permanentBan.status,
    "active",
  );

  TestValidator.equals(
    "ban ID should match original",
    permanentBan.id,
    temporaryBan.id,
  );
}
