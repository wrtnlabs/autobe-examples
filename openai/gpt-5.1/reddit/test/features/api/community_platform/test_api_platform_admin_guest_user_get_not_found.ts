import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify error behavior when a platform admin requests a guest user by a
 * non-existent UUID.
 *
 * Business purpose:
 *
 * - Platform administrators must receive a clear error when drilling into a guest
 *   user that has been removed or never existed, rather than seeing partial
 *   data or ambiguous results.
 * - This test ensures that the detail endpoint for guest users properly rejects
 *   lookups for unknown UUID primary keys.
 *
 * Scenario:
 *
 * 1. Register and authenticate a platform administrator via POST
 *    /auth/platformAdmin/join, ensuring a valid platformAdmin session is
 *    established on the shared SDK connection.
 * 2. Generate a random UUID that is not expected to correspond to any existing
 *    community_platform_guestusers record.
 * 3. Invoke GET /communityPlatform/platformAdmin/guestUsers/{guestUserId} using
 *    that UUID as guestUserId.
 * 4. Assert that the API call fails (throws) rather than returning a successful
 *    ICommunityPlatformGuestuser payload.
 *
 * Notes and constraints:
 *
 * - We do not have a guest-user creation API in the provided materials, so we
 *   cannot deterministically ensure that the UUID is absent in the database.
 *   Instead, we treat the call as an error-expected probe for an arbitrary
 *   unknown UUID, aligned with the documented behavior of returning 404 when no
 *   record matches.
 * - Following the global testing guidelines, we avoid asserting specific HTTP
 *   status codes or error payload shapes. Instead, we only assert that the call
 *   fails using TestValidator.error.
 * - All request bodies and parameters must be strictly type-correct; we do not
 *   perform any type-error testing.
 */
export async function test_api_platform_admin_guest_user_get_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // Basic sanity check on the admin identity (optional but descriptive).
  TestValidator.predicate(
    "platform admin id must be a non-empty uuid string",
    () => platformAdmin.id.length > 0,
  );

  // 2. Generate a random UUID that is presumed not to match any guest user.
  const missingGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-4. Invoke the guestUsers.at endpoint and assert that it fails.
  await TestValidator.error(
    "requesting a non-existent guest user should result in an error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.at(
        connection,
        {
          guestUserId: missingGuestUserId,
        },
      );
    },
  );
}
