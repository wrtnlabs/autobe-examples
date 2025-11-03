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
 * Test retrieval of detailed information about a guest user by their unique
 * guest ID.
 *
 * The test involves the following steps:
 *
 * 1. Create a guest user record as an unauthenticated user by calling the public
 *    endpoint.
 * 2. Authenticate as an admin user using the admin join endpoint.
 * 3. Use the admin authorization to fetch the detailed guest user information by
 *    guest ID.
 * 4. Validate the guest user information including id, created_at, and sessions.
 * 5. Test error handling for invalid/non-existent guest IDs.
 */
export async function test_api_redditcommunityadmin_guest_user_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest user record
  const guestCreateBody = {} satisfies IRedditCommunityGuest.ICreate;
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // Step 2: Authenticate as an admin user
  const userId = typia.random<string & tags.Format<"uuid">>();
  const adminCreateBody = {
    user_id: userId,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Use admin token automatically managed by SDK

  // Step 3: Retrieve detailed guest user info with admin authorization
  const guestDetails: IRedditCommunityGuest =
    await api.functional.redditCommunity.admin.guests.at(connection, {
      guestId: guest.id,
    });
  typia.assert(guestDetails);

  // Step 4: Validate guest details
  TestValidator.equals("guest ID matches", guestDetails.id, guest.id);
  TestValidator.predicate(
    "guest created_at is a valid ISO date-time string",
    typeof guestDetails.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        guestDetails.created_at,
      ),
  );

  if (
    guestDetails.reddit_community_guest_sessions !== undefined &&
    guestDetails.reddit_community_guest_sessions !== null
  ) {
    TestValidator.predicate(
      "guest sessions is a non-empty array if defined",
      Array.isArray(guestDetails.reddit_community_guest_sessions),
    );
    for (const session of guestDetails.reddit_community_guest_sessions) {
      typia.assert(session);
      TestValidator.equals(
        "guest session guest ID matches",
        session.reddit_community_guest_id,
        guest.id,
      );
      TestValidator.predicate(
        "guest session created_at is ISO date-time",
        typeof session.created_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
            session.created_at,
          ),
      );
    }
  }

  // Step 5: Test error handling for non-existent guest ID
  let fakeGuestId = typia.random<string & tags.Format<"uuid">>();
  if (fakeGuestId === guest.id)
    fakeGuestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent guest ID should fail",
    async () => {
      await api.functional.redditCommunity.admin.guests.at(connection, {
        guestId: fakeGuestId,
      });
    },
  );
}
