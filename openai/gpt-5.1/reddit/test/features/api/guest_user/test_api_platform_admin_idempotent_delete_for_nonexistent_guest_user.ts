import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate idempotent deletion attempts for a non-existent guest user.
 *
 * Business goal
 *
 * - Ensure that a platform administrator attempting to delete a guest user that
 *   does not exist receives a stable client-side failure (some error) and that
 *   the operation is safe and idempotent: repeating the same delete does not
 *   change system state or cause server crashes.
 *
 * Scenario
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain an authenticated admin session.
 * 2. Create at least one account status through POST
 *    /communityPlatform/platformAdmin/accountStatuses using
 *    ICommunityPlatformAccountStatus.ICreate. This reflects normal platform
 *    setup expectations even though no guest user is actually deleted.
 * 3. Generate a random UUID string for guestUserId that is not used anywhere in
 *    this test (no guest creation APIs exist in the provided SDK list), so it
 *    is highly likely to be non-existent.
 * 4. Call api.functional.communityPlatform.platformAdmin.guestUsers.erase with
 *    that guestUserId while authenticated as the platform admin.
 * 5. Expect the call to fail with some error (HttpError thrown by the SDK),
 *    indicating that the guest user does not exist. We deliberately do not
 *    assert any specific HTTP status code.
 * 6. Call the same erase endpoint again with the same non-existent guestUserId and
 *    make the same assertion: it still fails by throwing an error and does not
 *    suddenly succeed or behave differently. This validates idempotent behavior
 *    from the client perspective.
 *
 * Implementation notes
 *
 * - Use typia.random<ICommunityPlatformPlatformadmin.IJoin>() to populate the
 *   admin join body. This guarantees that all required fields are present and
 *   properly formatted, including email and href/referrer URLs.
 * - Use typia.random<ICommunityPlatformAccountStatus.ICreate>() for the account
 *   status creation body, then typia.assert() to validate the returned
 *   ICommunityPlatformAccountStatus.
 * - Generate the non-existent guestUserId using typia.random<string &
 *   tags.Format<"uuid">>() to ensure UUID formatting.
 * - Use TestValidator.error with a descriptive title for both erase invocations.
 *   Since the function under test returns void, success cases would simply not
 *   throw; therefore, the presence of an error is the validation of the
 *   not-found style behavior.
 * - Never attempt to inspect or mutate connection.headers directly; the join()
 *   helper will set Authorization under the hood.
 */
export async function test_api_platform_admin_idempotent_delete_for_nonexistent_guest_user(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create at least one account status as platform admin
  const accountStatusBody =
    typia.random<ICommunityPlatformAccountStatus.ICreate>();
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(accountStatus);

  // 3. Generate a UUID that is extremely unlikely to correspond to any guest user
  const nonexistentGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4 & 5. First deletion attempt should fail with some error (e.g., HttpError)
  await TestValidator.error(
    "first deletion of non-existent guest user should raise an error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.erase(
        connection,
        {
          guestUserId: nonexistentGuestUserId,
        },
      );
    },
  );

  // 6. Second deletion attempt with the same id should behave identically
  await TestValidator.error(
    "second deletion of same non-existent guest user remains an error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.erase(
        connection,
        {
          guestUserId: nonexistentGuestUserId,
        },
      );
    },
  );
}
