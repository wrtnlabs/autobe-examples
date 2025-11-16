import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator ability to update ban reason documentation after initial ban
 * issuance.
 *
 * This test validates the complete workflow of issuing a community ban and then
 * updating the ban reason with detailed documentation. It verifies that:
 *
 * 1. A moderator can create a temporary ban with a brief reason
 * 2. The ban reason can be updated with more detailed documentation
 * 3. The reason field maintains maximum length constraints (500 characters)
 * 4. The ban type, member scope, and expiration settings remain unchanged
 * 5. Updated reason is correctly returned in API responses
 *
 * Steps:
 *
 * 1. Create member account (will be banned)
 * 2. Create moderator account (will issue ban)
 * 3. Create community
 * 4. Appoint moderator to community
 * 5. Issue temporary ban with brief reason
 * 6. Update ban reason with detailed documentation
 * 7. Verify reason was updated and other fields unchanged
 * 8. Validate response structure and constraints
 */
export async function test_api_community_ban_update_reason_documentation(
  connection: api.IConnection,
) {
  // Step 1: Create member account (will be banned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account (will issue ban)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Switch to member context to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Appoint moderator to community
  const communityModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderator.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // Step 5: Switch to moderator context and issue temporary ban with brief reason
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const initialReason = "Rule violation";
  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: initialReason,
          expires_at: expiresAt,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Validate initial ban properties
  TestValidator.equals("ban type is temporary", ban.ban_type, "temporary");
  TestValidator.equals(
    "ban reason matches initial reason",
    ban.reason,
    initialReason,
  );
  TestValidator.equals("ban member matches", ban.member.id, member.id);

  // Step 6: Update ban reason with detailed documentation
  const detailedReason =
    "Repeated violation of Rule 5: Be respectful. Member posted inflammatory comments targeting other community members in three separate posts. After warning, member continued posting disruptive content. This temporary suspension allows for reflection on community guidelines.";
  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: detailedReason,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);

  // Step 7: Verify reason was updated and other fields unchanged
  TestValidator.equals(
    "updated reason matches new reason",
    updatedBan.reason,
    detailedReason,
  );
  TestValidator.equals(
    "ban type remains temporary",
    updatedBan.ban_type,
    "temporary",
  );
  TestValidator.equals("member id unchanged", updatedBan.member.id, member.id);
  TestValidator.equals(
    "community id unchanged",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "expires_at unchanged",
    updatedBan.expires_at,
    expiresAt,
  );

  // Step 8: Validate response structure and constraints
  TestValidator.predicate(
    "reason length within max 500 characters",
    updatedBan.reason.length <= 500,
  );
}
