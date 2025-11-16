import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_retrieval_immutable_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch to moderator context and create ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: RandomGenerator.paragraph(),
          expires_at: futureDate,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  const initialCreatedAt = ban.created_at;
  TestValidator.predicate(
    "initial ban created_at should be in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(initialCreatedAt),
  );

  // Step 5: Retrieve the ban multiple times and verify immutability
  const retrievedBan1 =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan1);

  TestValidator.equals(
    "first retrieval created_at should match initial created_at",
    retrievedBan1.created_at,
    initialCreatedAt,
  );

  // Add small delay to ensure any time-based changes would be detectable
  await new Promise((resolve) => setTimeout(resolve, 100));

  const retrievedBan2 =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan2);

  TestValidator.equals(
    "second retrieval created_at should remain immutable",
    retrievedBan2.created_at,
    initialCreatedAt,
  );

  // Step 6: Verify timestamp precision is preserved
  TestValidator.equals(
    "created_at timestamp precision should be consistent across retrievals",
    retrievedBan2.created_at.length,
    initialCreatedAt.length,
  );

  // Step 7: Additional verification of ban structure and data consistency
  TestValidator.equals(
    "ban ID should remain consistent",
    retrievedBan2.id,
    ban.id,
  );

  TestValidator.equals(
    "community reference should remain consistent",
    retrievedBan2.community.id,
    community.id,
  );

  TestValidator.equals(
    "member reference should remain consistent",
    retrievedBan2.member.id,
    member.id,
  );

  TestValidator.equals(
    "ban reason should remain consistent",
    retrievedBan2.reason,
    ban.reason,
  );

  TestValidator.equals(
    "ban type should remain consistent",
    retrievedBan2.ban_type,
    ban.ban_type,
  );
}
