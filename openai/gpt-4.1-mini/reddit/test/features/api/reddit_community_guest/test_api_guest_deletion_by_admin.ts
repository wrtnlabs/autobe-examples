import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Validate the complete guest user deletion by admin user workflow.
 *
 * 1. Admin joins by registering new admin credentials and obtains authorization.
 * 2. Admin authenticated session is used to create a new guest user record.
 * 3. The guest user record's ID is extracted for deletion.
 * 4. Admin deletes the guest user by the obtained ID.
 * 5. Validate that admin and guest creation responses satisfy their types.
 * 6. The deletion executes successfully without returning content.
 */
export async function test_api_guest_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins with a unique valid email and a fixed password
  const adminBody: IRedditCommunityAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  };
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Create a guest user record with minimal required fields
  const nowISOString: string & tags.Format<"date-time"> =
    new Date().toISOString() satisfies string as string;
  const guestCreateBody: IRedditCommunityGuest.ICreate = {
    session_start_time: nowISOString,
  };

  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunity.guests.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(guest);

  // 3. Delete the guest user as the authenticated admin by ID
  await api.functional.redditCommunity.admin.redditCommunity.guests.erase(
    connection,
    { id: guest.id },
  );
}
