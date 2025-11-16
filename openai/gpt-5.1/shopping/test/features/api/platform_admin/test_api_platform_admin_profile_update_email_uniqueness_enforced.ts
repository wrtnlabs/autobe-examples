import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure platform admin email uniqueness is enforced on profile update.
 *
 * Business workflow validated by this test:
 *
 * 1. Register the first platform admin (Admin A) via /auth/platformAdmin/join and
 *    store its email and id.
 * 2. Register the second platform admin (Admin B) via the same join endpoint with
 *    a different email and store its id.
 * 3. Create a guest user via /shoppingMall/platformAdmin/guestUsers as a baseline
 *    dependency exercise (not strictly required for uniqueness itself).
 * 4. Fetch Admin B's current profile via GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} to capture
 *    its original email.
 * 5. Attempt to update Admin B via PUT
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} using an
 *    IShoppingMallPlatformAdmin.IUpdate payload that sets email to Admin A's
 *    email (and optionally tweaks another field) and assert that this call
 *    fails with a business error using TestValidator.error, without checking
 *    specific HTTP status codes.
 * 6. Re-fetch Admin B and verify that its email has not changed to Admin A's email
 *    and still equals the original one, proving no partial update occurred.
 */
export async function test_api_platform_admin_profile_update_email_uniqueness_enforced(
  connection: api.IConnection,
) {
  // 1. Register Admin A with a unique email
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinAdminABody = {
    email: adminAEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinAdminABody,
    });
  typia.assert(adminA);

  // 2. Register Admin B with a different unique email
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinAdminBBody = {
    email: adminBEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinAdminBBody,
    });
  typia.assert(adminB);

  // 3. Optionally create a guest user as dependency setup
  const guestUserBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: "Mozilla/5.0 (E2E Test Guest)",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestUserBody,
      },
    );
  typia.assert(guestUser);

  // 4. Fetch Admin B's current profile to capture the original email
  const originalBProfile: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: adminB.id,
      },
    );
  typia.assert(originalBProfile);

  TestValidator.equals(
    "original Admin B email must match join email",
    originalBProfile.email,
    adminB.email,
  );

  // 5. Attempt to update Admin B's email to Admin A's email — must fail
  const conflictingUpdateBody = {
    email: adminAEmail,
    displayName: `${originalBProfile.displayName}-conflict-test`,
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  await TestValidator.error(
    "updating platform admin email to an existing admin's email must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
        connection,
        {
          platformAdminId: adminB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 6. Re-fetch Admin B to confirm no partial update occurred
  const reloadedBProfile: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: adminB.id,
      },
    );
  typia.assert(reloadedBProfile);

  // Email must remain the original unique value, not Admin A's email
  TestValidator.equals(
    "Admin B email must remain unchanged after failed uniqueness update",
    reloadedBProfile.email,
    originalBProfile.email,
  );
  TestValidator.notEquals(
    "Admin B email must not equal Admin A email after failed update",
    reloadedBProfile.email,
    adminA.email,
  );
}
