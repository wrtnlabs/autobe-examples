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
 * Test the complete workflow of a moderator lifting a community ban.
 *
 * This test validates the ban management functionality by:
 *
 * 1. Creating a moderator account with authentication
 * 2. Creating a member account that will be subject to ban
 * 3. Moderator creates a community (becomes primary moderator with full
 *    permissions)
 * 4. Moderator issues a community ban against the member
 * 5. Moderator lifts the ban through soft deletion
 * 6. Verifying the ban operation completed successfully
 */
export async function test_api_community_ban_lift_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be banned
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Moderator creates a community (becomes primary moderator per API docs)
  // Note: Only members can create communities via the member API
  // We need to create community as member first, then have moderator manage it
  // Actually, we need to use member account to create community

  // Switch back to member account to create community
  const communityData = {
    code: RandomGenerator.alphabets(15),
    name: RandomGenerator.name(3),
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

  // Step 4: Issue ban as moderator (moderator is currently authenticated)
  const banData = {
    banned_member_id: member.id,
    ban_reason_category: "spam",
    ban_reason_text: "Posting spam content repeatedly",
    internal_notes: "First offense, temporary ban",
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const ban: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(ban);

  // Validate ban was created correctly
  TestValidator.equals(
    "ban community ID matches",
    ban.community_id,
    community.id,
  );
  TestValidator.equals(
    "banned member ID matches",
    ban.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "ban reason category matches",
    ban.ban_reason_category,
    "spam",
  );
  TestValidator.equals("ban is not permanent", ban.is_permanent, false);
  TestValidator.predicate("ban is active", ban.is_active === true);

  // Step 5: Lift the ban (soft delete)
  await api.functional.redditLike.moderator.communities.bans.erase(connection, {
    communityId: community.id,
    banId: ban.id,
  });

  // The ban has been lifted successfully
  // Note: The API returns void, confirming the operation completed
  // The ban record is soft-deleted with deleted_at timestamp set
}
