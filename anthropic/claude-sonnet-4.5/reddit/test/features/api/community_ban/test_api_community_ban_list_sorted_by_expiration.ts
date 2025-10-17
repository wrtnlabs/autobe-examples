import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving community bans sorted by expiration date to identify
 * soon-to-expire bans.
 *
 * This test validates the ban management workflow where moderators need to
 * review bans by expiration date to identify which bans will expire soonest.
 * This is critical for moderation teams to proactively review temporary bans
 * and decide whether to renew, modify, or let them expire.
 *
 * Test workflow:
 *
 * 1. Register a member and create a community (member becomes primary moderator)
 * 2. Register a moderator account and assign with manage_users permission
 * 3. Create multiple member accounts that will receive bans
 * 4. Have each member create posts to establish participation
 * 5. Issue temporary bans with different expiration dates (1 day, 7 days, 30 days)
 * 6. Retrieve ban list and verify sorting by expiration date ascending
 * 7. Validate that bans expiring soonest appear first in results
 * 8. Verify pagination works correctly with the expiration-based sorting
 */
export async function test_api_community_ban_list_sorted_by_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create community founder member
  const founderMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(founderMember);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Register moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Assign moderator with manage_users permission
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_users",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Create multiple members who will be banned
  const bannedMembers = await ArrayUtil.asyncRepeat(3, async () => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(member);

    // Have member create a post to establish participation
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);

    return member;
  });

  // Step 6: Issue bans with different expiration dates (already authenticated as moderator)
  const now = new Date();
  const expirationDates = [
    new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  ];

  const createdBans = await ArrayUtil.asyncMap(
    bannedMembers,
    async (member, index) => {
      const ban =
        await api.functional.redditLike.moderator.communities.bans.create(
          connection,
          {
            communityId: community.id,
            body: {
              banned_member_id: member.id,
              ban_reason_category: "spam",
              ban_reason_text: `Temporary ban for testing - expires in ${index === 0 ? "1 day" : index === 1 ? "7 days" : "30 days"}`,
              is_permanent: false,
              expiration_date: expirationDates[index],
            } satisfies IRedditLikeCommunityBan.ICreate,
          },
        );
      typia.assert(ban);
      return ban;
    },
  );

  // Step 7: Retrieve ban list (should be sorted by expiration date by default)
  const banListPage =
    await api.functional.redditLike.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          is_active: true,
          is_permanent: false,
        } satisfies IRedditLikeCommunityBan.IRequest,
      },
    );
  typia.assert(banListPage);

  // Step 8: Validate pagination structure
  TestValidator.equals(
    "ban list page current",
    banListPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "ban list has records",
    banListPage.pagination.records >= 3,
  );
  TestValidator.predicate("ban list has data", banListPage.data.length >= 3);

  // Step 9: Verify bans are sorted by expiration date ascending (soonest first)
  const retrievedBans = banListPage.data;
  for (let i = 0; i < retrievedBans.length - 1; i++) {
    const currentBan = retrievedBans[i];
    const nextBan = retrievedBans[i + 1];

    if (
      currentBan.expiration_date !== null &&
      currentBan.expiration_date !== undefined &&
      nextBan.expiration_date !== null &&
      nextBan.expiration_date !== undefined
    ) {
      const currentExpirationDate = typia.assert(currentBan.expiration_date!);
      const nextExpirationDate = typia.assert(nextBan.expiration_date!);

      const currentExpiration = new Date(currentExpirationDate).getTime();
      const nextExpiration = new Date(nextExpirationDate).getTime();

      TestValidator.predicate(
        "bans sorted by expiration ascending",
        currentExpiration <= nextExpiration,
      );
    }
  }

  // Step 10: Verify that the earliest expiring ban (1 day) is first
  const firstBan = retrievedBans[0];
  typia.assert(firstBan);
  const firstExpirationDate = typia.assert(firstBan.expiration_date!);

  const firstExpiration = new Date(firstExpirationDate).getTime();
  const oneDayExpiration = new Date(expirationDates[0]).getTime();

  TestValidator.predicate(
    "first ban has earliest expiration",
    Math.abs(firstExpiration - oneDayExpiration) < 1000,
  );
}
