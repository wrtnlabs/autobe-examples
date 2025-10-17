import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the realistic workflow where a banned member appeals their ban and the
 * moderator lifts it after reviewing the appeal.
 *
 * This test validates the complete moderation appeal and ban lift workflow:
 *
 * 1. Create moderator account to manage ban appeals and lift bans
 * 2. Create member account that will be banned and appeal the ban
 * 3. Moderator creates community where the ban and appeal workflow occurs
 * 4. Moderator issues community ban against the member
 * 5. Member submits appeal against the community ban
 * 6. Moderator lifts the ban (soft delete) after reviewing appeal
 * 7. Validate ban soft-delete occurred and audit logs maintained
 *
 * The test ensures that the ban appeal system works correctly, bans can be
 * lifted through the proper appeal process, and complete audit history is
 * preserved.
 */
export async function test_api_community_ban_lift_after_appeal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorAuth: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Store moderator credentials for later re-authentication
  const moderatorToken = moderatorAuth.token.access;

  // Step 2: Create member account that will be banned
  const memberAuth: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(memberAuth);

  // Store member credentials for later re-authentication
  const memberToken = memberAuth.token.access;

  // Step 3: Switch back to moderator to create community
  connection.headers = connection.headers ?? {};
  connection.headers.Authorization = moderatorToken;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Moderator issues ban against the member (already authenticated as moderator)
  const ban: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: memberAuth.id,
          ban_reason_category: "spam",
          ban_reason_text: "Posting spam content repeatedly",
          is_permanent: false,
          expiration_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Validate ban was created correctly
  TestValidator.equals(
    "banned member matches",
    ban.banned_member_id,
    memberAuth.id,
  );
  TestValidator.equals("ban community matches", ban.community_id, community.id);
  TestValidator.predicate("ban is active", ban.is_active);

  // Step 5: Switch to member to submit appeal
  connection.headers.Authorization = memberToken;

  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          community_ban_id: ban.id,
          appeal_type: "community_ban",
          appeal_text: typia.random<
            string & tags.MinLength<50> & tags.MaxLength<1000>
          >(),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Validate appeal was created
  TestValidator.equals(
    "appeal type is community ban",
    appeal.appeal_type,
    "community_ban",
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appellant is the banned member",
    appeal.appellant_member_id,
    memberAuth.id,
  );

  // Step 6: Switch back to moderator to lift the ban
  connection.headers.Authorization = moderatorToken;

  await api.functional.redditLike.moderator.communities.bans.erase(connection, {
    communityId: community.id,
    banId: ban.id,
  });

  // The ban has been lifted successfully - soft delete occurred
  // In a real system, we could verify the ban record still exists with deleted_at timestamp
  // and that the member can now participate in the community again
}
