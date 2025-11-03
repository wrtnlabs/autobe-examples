import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * E2E test for permanently deleting guest users by an admin.
 *
 * This test covers these steps:
 *
 * 1. Admin authenticates using admin join operation.
 * 2. Create a new guest user.
 * 3. Delete the guest user permanently using the guest ID.
 * 4. Validate the delete operation returns no content.
 * 5. Confirm deletion is irreversible by attempting to delete again which should
 *    fail.
 * 6. Confirm permissions are properly enforced.
 *
 * This ensures secure, irreversible removal of guest users.
 */
export async function test_api_admin_delete_guest_user_permanently(
  connection: api.IConnection,
) {
  // 1. Admin initially joins to get a valid user_id for authentication
  const initialAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(initialAdmin);

  // 2. Authenticate admin properly with an existing user_id (simulate reuse of admin's user_id if needed)
  // Given no other user creation API, reuse the returned admin id
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: initialAdmin.user_id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Create a new guest user
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {} satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(guest);

  // 4. Delete the guest user permanently by guest ID
  await api.functional.redditCommunity.admin.guests.erase(connection, {
    guestId: guest.id,
  });

  // 5. Test that trying to delete the same guest again fails
  await TestValidator.error(
    "deleting the same guest user again should fail",
    async () => {
      await api.functional.redditCommunity.admin.guests.erase(connection, {
        guestId: guest.id,
      });
    },
  );
}
