import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test retrieval of temporary community ban details showing expiration
 * information.
 *
 * Validates that moderators can retrieve temporary ban records with complete
 * expiration metadata including expiration timestamp, duration settings, and
 * time-limited enforcement status for proper time-based restriction
 * management.
 *
 * Workflow:
 *
 * 1. Create moderator account
 * 2. Create member account to be banned
 * 3. Moderator creates a community
 * 4. Moderator issues temporary ban with expiration date
 * 5. Moderator retrieves ban details
 * 6. Validate temporary ban metadata (expiration, is_permanent flag, active
 *    status)
 */
export async function test_api_community_ban_retrieval_with_temporary_ban(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be banned
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Switch back to moderator and create a community
  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Moderator issues temporary ban with expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);

  const banData = {
    banned_member_id: member.id,
    ban_reason_category: "spam",
    ban_reason_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 8,
    }),
    is_permanent: false,
    expiration_date: expirationDate.toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const createdBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(createdBan);

  // Step 5: Moderator retrieves ban details
  const retrievedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.at(connection, {
      communityId: community.id,
      banId: createdBan.id,
    });
  typia.assert(retrievedBan);

  // Step 6: Validate temporary ban metadata
  TestValidator.equals("ban ID matches", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban is not permanent",
    retrievedBan.is_permanent,
    false,
  );
  TestValidator.predicate(
    "expiration date exists for temporary ban",
    retrievedBan.expiration_date !== null &&
      retrievedBan.expiration_date !== undefined,
  );

  if (retrievedBan.expiration_date) {
    TestValidator.equals(
      "expiration date matches",
      retrievedBan.expiration_date,
      expirationDate.toISOString(),
    );
  }

  TestValidator.equals("ban is active", retrievedBan.is_active, true);
  TestValidator.equals(
    "ban reason category matches",
    retrievedBan.ban_reason_category,
    banData.ban_reason_category,
  );
  TestValidator.equals(
    "ban reason text matches",
    retrievedBan.ban_reason_text,
    banData.ban_reason_text,
  );
}
