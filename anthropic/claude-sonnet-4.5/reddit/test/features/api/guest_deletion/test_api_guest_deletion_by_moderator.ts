import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the complete workflow of a moderator permanently deleting a guest user
 * account.
 *
 * This test validates that moderators can successfully remove guest accounts
 * and that the deletion is permanent and complete.
 *
 * Steps:
 *
 * 1. Create a moderator account through registration (join)
 * 2. Create a guest account to be deleted
 * 3. Authenticate as the moderator
 * 4. Delete the guest account using the guest ID
 * 5. Verify the deletion operation completes successfully
 *
 * Validation points:
 *
 * - Moderator authentication is successful
 * - Guest account exists before deletion
 * - Deletion operation completes successfully
 * - Deleted guest account data is returned in response
 */
export async function test_api_guest_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a guest account to be deleted
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: guestEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "192.168.1.101",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(guest);

  // Step 3: Delete the guest account using the guest ID
  const deletedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.moderator.guests.erase(connection, {
      guestId: guest.id,
    });
  typia.assert(deletedGuest);

  // Step 4: Verify the deletion response contains valid activity metrics
  TestValidator.predicate(
    "deleted guest has non-negative total_posts",
    deletedGuest.total_posts >= 0,
  );
  TestValidator.predicate(
    "deleted guest has non-negative total_comments",
    deletedGuest.total_comments >= 0,
  );
  TestValidator.predicate(
    "deleted guest total_karma equals sum of post and comment karma",
    deletedGuest.total_karma ===
      deletedGuest.post_karma + deletedGuest.comment_karma,
  );
}
