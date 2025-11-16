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
 * Test creating a permanent community ban for a member with serious rule
 * violations.
 *
 * A moderator should be able to issue a permanent ban that remains indefinitely
 * until moderator action lifts it. The scenario validates that ban_type is set
 * to 'permanent', expires_at is null (not required for permanent bans), and all
 * other fields are correctly populated. Verify the ban response includes all
 * metadata, created_at timestamp, and references to the banned member,
 * moderator, and community.
 *
 * Test workflow:
 *
 * 1. Create a moderator account through authentication
 * 2. Create a member account to be banned
 * 3. Create a community
 * 4. Issue a permanent ban against the member with specified reason and
 *    ban_type='permanent'
 * 5. Validate the ban response contains all required fields
 * 6. Verify permanent bans have no automatic expiration timestamp
 */
export async function test_api_community_ban_creation_permanent_ban(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberConnection = { ...connection, headers: {} };
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(member);

  // 3. Create a community as member
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 4. Issue a permanent ban using moderator context
  const banReason = "Repeated violation of Rule 5: Be respectful";
  const banData = {
    member_id: member.id,
    ban_type: "permanent" as const,
    reason: banReason,
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const permanentBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(permanentBan);

  // 5. Validate ban response contains all required fields
  TestValidator.equals(
    "ban type is permanent",
    permanentBan.ban_type,
    "permanent",
  );

  TestValidator.predicate(
    "expires_at is null for permanent ban",
    permanentBan.expires_at === null || permanentBan.expires_at === undefined,
  );

  TestValidator.equals(
    "ban reason matches provided reason",
    permanentBan.reason,
    banReason,
  );

  TestValidator.equals(
    "banned member id matches",
    permanentBan.member.id,
    member.id,
  );

  TestValidator.equals(
    "community id matches",
    permanentBan.community.id,
    community.id,
  );

  TestValidator.equals(
    "moderator id matches",
    permanentBan.moderator.id,
    moderator.id,
  );

  // 6. Verify permanent ban has no expiration
  TestValidator.predicate(
    "permanent ban has no automatic expiration timestamp",
    permanentBan.expires_at === null || permanentBan.expires_at === undefined,
  );
}
