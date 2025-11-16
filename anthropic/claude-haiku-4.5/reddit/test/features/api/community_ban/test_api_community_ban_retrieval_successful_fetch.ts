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
 * Test retrieving a previously created community ban record.
 *
 * A moderator should be able to fetch complete ban details including the ban
 * ID, banned member information, issuing moderator, ban type, reason, creation
 * timestamp, and expiration timestamp (for temporary bans). Verify that all ban
 * metadata is returned correctly and the response structure matches the
 * expected schema with proper references to community, member, and moderator
 * entities.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator to establish authorization
 * 2. Authenticate as member to establish the account that will be banned
 * 3. Create a community by member
 * 4. Create a temporary ban by moderator
 * 5. Retrieve the ban record by ID
 * 6. Validate all ban details and metadata
 */
export async function test_api_community_ban_retrieval_successful_fetch(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail = RandomGenerator.alphaNumeric(8) + "@moderator.test";
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Authenticate as member who will be banned
  const memberEmail = RandomGenerator.alphaNumeric(8) + "@member.test";
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: memberPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create a community (member is already authenticated from join)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch to moderator authentication for ban creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 4. Create a temporary ban by moderator
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: banReason,
          expires_at: expirationTime.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(createdBan);

  // 5. Retrieve the ban record by ID (moderator context already set)
  const retrievedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: createdBan.id,
      },
    );
  typia.assert(retrievedBan);

  // 6. Validate all ban details match what was created
  TestValidator.equals("ban ID matches", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.member.id,
    member.id,
  );
  TestValidator.equals(
    "ban type is temporary",
    retrievedBan.ban_type,
    "temporary",
  );
  TestValidator.equals("ban reason matches", retrievedBan.reason, banReason);
  TestValidator.predicate(
    "creation timestamp is set",
    retrievedBan.created_at !== null && retrievedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "expiration timestamp is set",
    retrievedBan.expires_at !== null && retrievedBan.expires_at !== undefined,
  );
  TestValidator.equals(
    "no appeal submitted initially",
    retrievedBan.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "no appeal resolved initially",
    retrievedBan.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "appeal approved is null initially",
    retrievedBan.appeal_approved,
    null,
  );
}
