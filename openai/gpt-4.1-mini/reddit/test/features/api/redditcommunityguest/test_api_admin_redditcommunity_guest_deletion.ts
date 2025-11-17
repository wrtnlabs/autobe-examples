import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Validate the deletion of a Reddit community guest user by an admin.
 *
 * Business context: Only authenticated admin users are authorized to delete
 * guest users from the Reddit community platform. This test executes the full
 * flow including admin registration, guest user creation, and guest deletion.
 * It confirms that the deletion process is successful and respects security
 * constraints.
 *
 * Steps:
 *
 * 1. Register a new admin user via /auth/admin/join to obtain JWT tokens.
 * 2. Create a redditCommunity guest user via
 *    /redditCommunity/redditCommunityGuests.
 * 3. Delete the created guest user by the admin via
 *    /redditCommunity/admin/redditCommunityGuests/{id}.
 * 4. Verify that the deletion executes without errors.
 */
export async function test_api_admin_redditcommunity_guest_deletion(
  connection: api.IConnection,
) {
  // 1. Admin registration to authenticate and obtain authorization tokens
  const adminInput: IRedditCommunityAdmin.IJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPassword123!",
    href: `https://example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "https://referrer.example.com/",
  };

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Create a guest user to be deleted
  const guestInput: IRedditCommunityGuest.ICreate = {
    href: `https://guest.example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphaNumeric(4)}`,
    is_banned: false,
  };

  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      {
        body: guestInput,
      },
    );
  typia.assert(guest);

  // 3. Delete the created guest user by admin
  await api.functional.redditCommunity.admin.redditCommunityGuests.erase(
    connection,
    {
      id: guest.id,
    },
  );

  // 4. If no exception thrown until here, test passes for successful deletion
}
