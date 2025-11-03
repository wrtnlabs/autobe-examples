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
 * Validates that an admin user can update an existing guest user record.
 *
 * The test performs the following steps:
 *
 * 1. Admin signs up and authenticates via /auth/admin/join.
 * 2. Creates a guest user record to be updated.
 * 3. Admin updates the guest user's modifiable metadata fields such as created_at.
 * 4. Validates the update was successful by comparing the updated fields.
 *
 * The test ensures authorization is enforced, update operation succeeds, and
 * guest user metadata changes are applied correctly.
 */
export async function test_api_guest_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signs up and obtains authorization token
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a guest user record to be updated
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {},
    });
  typia.assert(guest);

  // 3. Admin updates the guest user record's modifiable fields
  const newCreatedAt: string = new Date(
    Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  ).toISOString();
  const updatedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.admin.guests.update(connection, {
      guestId: guest.id,
      body: {
        created_at: newCreatedAt,
      } satisfies IRedditCommunityGuest.IUpdate,
    });
  typia.assert(updatedGuest);

  // 4. Validation of updated guest user record
  TestValidator.equals(
    "guest ID remains unchanged after update",
    updatedGuest.id,
    guest.id,
  );
  TestValidator.equals(
    "guest created_at is updated correctly",
    updatedGuest.created_at,
    newCreatedAt,
  );
}
