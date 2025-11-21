import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that moderators can retrieve detailed member information after community
 * creation.
 *
 * This test validates the complete authorization flow where a moderator creates
 * an account, a member creates an account and establishes a community, and then
 * the moderator retrieves the member's detailed information. It ensures proper
 * authorization boundaries and validates that only appropriate member
 * information is exposed to moderators for community management.
 */
export async function test_api_moderator_member_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Switch to member context and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/create-community",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Retrieve member information as moderator
  const retrievedMember =
    await api.functional.communityPlatform.moderator.members.at(connection, {
      memberId: member.id,
    });
  typia.assert(retrievedMember);

  // Step 6: Validate that retrieved member information matches created member
  TestValidator.equals("member ID should match", retrievedMember.id, member.id);
  TestValidator.equals(
    "member email should match",
    retrievedMember.email,
    member.email,
  );
  TestValidator.equals(
    "member display name should match",
    retrievedMember.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "member karma score should be 0",
    retrievedMember.karma_score,
    0,
  );
  TestValidator.equals(
    "member verification status should be false",
    retrievedMember.is_verified,
    false,
  );

  // Validate that sensitive information is not exposed
  TestValidator.predicate(
    "retrieved member should not contain password hash",
    !("password_hash" in retrievedMember),
  );
  TestValidator.predicate(
    "retrieved member should not contain token information",
    !("token" in retrievedMember),
  );
  TestValidator.predicate(
    "retrieved member should not contain deleted_at field",
    !("deleted_at" in retrievedMember),
  );
}
