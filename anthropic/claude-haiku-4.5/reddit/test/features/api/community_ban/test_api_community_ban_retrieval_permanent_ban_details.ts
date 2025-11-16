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
 * Test retrieving a permanent community ban and verifying ban_type is
 * 'permanent' with expires_at field as null. The permanent ban should not have
 * an expiration timestamp since it remains until explicitly lifted by moderator
 * action. Verify that all other ban details are present including the reason,
 * created_at timestamp, and audit trail information. Test that permanent bans
 * can be distinguished from temporary bans by the null expires_at and permanent
 * ban_type value.
 *
 * Setup flow:
 *
 * 1. Create moderator account for ban management
 * 2. Create community for ban context
 * 3. Create member account to be banned
 * 4. Create permanent ban record against the member
 * 5. Retrieve the ban record
 * 6. Validate permanent ban characteristics
 */
export async function test_api_community_ban_retrieval_permanent_ban_details(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/auth/moderator/join",
    referrer: "http://localhost:3000/auth",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 3: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/auth/member/join",
    referrer: "http://localhost:3000/auth",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 4: Switch to moderator context and create permanent ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const banData = {
    member_id: member.id,
    ban_type: "permanent",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(createdBan);
  TestValidator.predicate(
    "permanent ban created successfully",
    createdBan.id !== null,
  );

  // Step 5: Retrieve the permanent ban record
  const retrievedBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: createdBan.id,
      },
    );
  typia.assert(retrievedBan);

  // Step 6: Validate permanent ban characteristics
  TestValidator.equals(
    "ban_type is permanent",
    retrievedBan.ban_type,
    "permanent",
  );
  TestValidator.equals(
    "expires_at is null for permanent ban",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.predicate("ban has valid id", retrievedBan.id !== null);
  TestValidator.predicate(
    "ban reason is populated",
    retrievedBan.reason.length > 0,
  );
  TestValidator.predicate(
    "ban created_at timestamp exists",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "banned member id matches",
    retrievedBan.member.id === member.id,
  );
  TestValidator.predicate(
    "community id matches",
    retrievedBan.community.id === community.id,
  );
  TestValidator.predicate(
    "moderator id matches",
    retrievedBan.moderator.id === moderator.id,
  );
  TestValidator.equals(
    "appeal_submitted_at is null initially",
    retrievedBan.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "appeal_resolved_at is null initially",
    retrievedBan.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "appeal_approved is null initially",
    retrievedBan.appeal_approved,
    null,
  );
}
