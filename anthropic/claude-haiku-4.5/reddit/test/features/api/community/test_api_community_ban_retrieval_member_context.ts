import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_retrieval_member_context(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.name(),
      password: creatorPassword,
      href: "https://example.com/auth/member/join",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 2: Create community with creator member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create second member account (to be banned)
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMemberPassword = RandomGenerator.alphaNumeric(12);
  const bannedMemberUsername = RandomGenerator.name();
  const bannedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: bannedMemberEmail,
      username: bannedMemberUsername,
      password: bannedMemberPassword,
      href: "https://example.com/auth/member/join",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(bannedMember);

  // Step 4: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      password: moderatorPassword,
      href: "https://example.com/auth/moderator/join",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Switch to moderator context to create ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Create a temporary ban for the banned member
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const expirationTime = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "temporary",
          reason: banReason,
          expires_at: expirationTime,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 7: Retrieve the ban to verify complete member context
  const retrievedBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);

  // Step 8: Validate member context summary is complete and accurate
  TestValidator.equals(
    "retrieved ban member username matches banned member",
    retrievedBan.member.username,
    bannedMemberUsername,
  );

  TestValidator.equals(
    "retrieved ban member email matches banned member",
    retrievedBan.member.email,
    bannedMemberEmail,
  );

  TestValidator.predicate(
    "ban member context includes account status field",
    () => retrievedBan.member.account_status !== undefined,
  );

  TestValidator.predicate("ban member account status is valid value", () =>
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      retrievedBan.member.account_status,
    ),
  );

  TestValidator.predicate(
    "ban member context includes karma score",
    () => typeof retrievedBan.member.karma_score === "number",
  );

  TestValidator.predicate(
    "member karma score is valid non-negative value",
    () => retrievedBan.member.karma_score >= 0,
  );

  TestValidator.predicate(
    "member email verified flag is present",
    () => typeof retrievedBan.member.email_verified === "boolean",
  );

  TestValidator.predicate(
    "member created_at timestamp is present",
    () => retrievedBan.member.created_at !== undefined,
  );

  TestValidator.equals(
    "retrieved ban has correct community context",
    retrievedBan.community.id,
    community.id,
  );

  TestValidator.equals(
    "retrieved ban shows correct issuing moderator",
    retrievedBan.moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "ban reason is preserved correctly",
    retrievedBan.reason,
    banReason,
  );

  TestValidator.equals(
    "ban type reflects temporary ban",
    retrievedBan.ban_type,
    "temporary",
  );
}
