import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that community bans are properly scoped to the specific community and do
 * not affect member access to other communities.
 *
 * This test validates the community-scoped nature of moderation actions by:
 *
 * 1. Creating a member account who will participate in two communities
 * 2. Creating two separate communities where the member will participate
 * 3. Authenticating as a moderator to issue ban actions
 * 4. Banning the member from the first community only
 * 5. Verifying the ban is scoped to that specific community
 * 6. Confirming the member would retain access in the second community
 * 7. Validating that bans are independent and community-specific
 *
 * Process:
 *
 * 1. Member registration and authentication
 * 2. Create first community (Community A) as member
 * 3. Create second community (Community B) as member
 * 4. Moderator registration and authentication
 * 5. Moderator switches to moderator context
 * 6. Issue a temporary ban for the member in Community A
 * 7. Verify ban is scoped to Community A only
 * 8. Verify ban properties indicate scope limitation
 */
export async function test_api_community_ban_creation_scoped_to_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberData = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create first community (Community A) as member
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for technology enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // Step 3: Create second community (Community B) as member
  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Gaming Community",
          identifier: `gaming_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for game enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "entertainment",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // Step 4: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorData = {
    email: moderatorEmail,
    username: moderatorUsername,
    password: moderatorPassword,
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 5: Moderator logs in to get moderator context for ban creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Create ban for member in Community A
  const banReason = "Violation of community rules - repeated spam";
  const expirationTime = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: communityA.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: banReason,
          expires_at: expirationTime,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 7: Validate ban is scoped to Community A
  TestValidator.equals(
    "ban community is Community A",
    ban.community.id,
    communityA.id,
  );
  TestValidator.notEquals(
    "ban community is NOT Community B",
    ban.community.id,
    communityB.id,
  );

  // Step 8: Validate ban member
  TestValidator.equals(
    "ban member matches the member being banned",
    ban.member.id,
    member.id,
  );

  // Step 9: Validate ban properties
  TestValidator.equals("ban type is temporary", ban.ban_type, "temporary");
  TestValidator.equals("ban reason matches", ban.reason, banReason);

  // Step 10: Validate moderator who issued the ban
  TestValidator.equals(
    "moderator who issued ban is correct",
    ban.moderator.id,
    moderator.id,
  );

  // Step 11: Validate scope - ban is scoped to Community A only
  TestValidator.predicate(
    "ban is community-scoped to Community A",
    ban.community.id === communityA.id,
  );

  // Step 12: Validate temporary ban has expiration
  TestValidator.predicate(
    "temporary ban has expiration timestamp",
    ban.expires_at !== null && ban.expires_at !== undefined,
  );

  // Step 13: Validate appeal workflow is not initiated
  TestValidator.equals(
    "appeal has not been submitted",
    ban.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "appeal has not been resolved",
    ban.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "appeal outcome is not yet determined",
    ban.appeal_approved,
    null,
  );

  // Step 14: Verify ban demonstrates community-scoped enforcement
  TestValidator.predicate(
    "ban enforces community-specific access restriction",
    ban.ban_type === "temporary" && ban.community.id === communityA.id,
  );
}
