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
 * Test creating a community ban with comprehensive documentation of the rule
 * violation.
 *
 * This test validates that moderators can issue bans with detailed violation
 * documentation supporting the appeal workflow and transparent communication.
 * The test creates:
 *
 * 1. Member and moderator authentication
 * 2. Community creation
 * 3. Target member account for banning
 * 4. Ban issuance with detailed reason (up to 500 characters)
 *
 * Verifies the reason field correctly stores and preserves the violation
 * documentation, enabling proper appeal processing and member communication
 * regarding disciplinary actions.
 */
export async function test_api_community_ban_creation_with_detailed_reason(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // 2. Create a community as the moderator
  const communityData = {
    name: RandomGenerator.name(3),
    identifier: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: "general",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 3. Authenticate as a member to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberToBan = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberToBan);

  // 4. Switch back to moderator context for ban creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create a detailed ban with comprehensive violation documentation
  const detailedReason =
    "Repeated violation of Rule 5: Be respectful - User posted three insulting comments targeting other members within 24 hours despite two warnings. This pattern of behavior violates our community standards and creates a hostile environment for other members.";

  const banData = {
    member_id: memberToBan.id,
    ban_type: "temporary" as const,
    reason: detailedReason,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(ban);

  // 6. Validate ban details
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("banned member matches", ban.member.id, memberToBan.id);
  TestValidator.equals(
    "moderator information is recorded",
    ban.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "detailed reason is preserved correctly",
    ban.reason,
    detailedReason,
  );
  TestValidator.equals("ban type is temporary", ban.ban_type, "temporary");
  TestValidator.predicate(
    "expiration timestamp is in the future",
    ban.expires_at ? new Date(ban.expires_at).getTime() > Date.now() : false,
  );
  TestValidator.predicate(
    "reason length is within maximum 500 characters",
    ban.reason.length <= 500,
  );
}
