import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that one platform administrator can retrieve another administrator's
 * detailed profile.
 *
 * Business goals:
 *
 * - Ensure that multiple platform admins can be created via the join endpoint.
 * - Verify that an authenticated platform admin (Caller Admin) can fetch another
 *   admin's profile (Admin B) using the detail endpoint.
 * - Confirm that the identity mapping is correct: the returned record corresponds
 *   to Admin B and does not leak credential secrets.
 *
 * Steps:
 *
 * 1. Create Admin A via POST /auth/platformAdmin/join.
 * 2. Create Admin B via POST /auth/platformAdmin/join.
 * 3. Create a Guest User via POST /shoppingMall/platformAdmin/guestUsers to
 *    satisfy upstream assumptions.
 * 4. Create Caller Admin via POST /auth/platformAdmin/join (this will be the
 *    active Authorization token).
 * 5. Call GET /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} with
 *    platformAdminId = Admin B's id using Caller Admin's session.
 * 6. Assert that the response matches Admin B's identity and lifecycle
 *    expectations and is distinct from Caller Admin.
 */
export async function test_api_platform_admin_detail_retrieval_for_another_admin(
  connection: api.IConnection,
) {
  // 1. Create Admin A (existence and multi-admin scenario context)
  const adminARequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA = await api.functional.auth.platformAdmin.join(connection, {
    body: adminARequest,
  });
  typia.assert(adminA);

  // 2. Create Admin B whose profile will be retrieved later
  const adminBRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB = await api.functional.auth.platformAdmin.join(connection, {
    body: adminBRequest,
  });
  typia.assert(adminB);

  // 3. Create a guest user (dependency setup)
  const guestUserRequest = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestUserRequest },
    );
  typia.assert(guestUser);

  // 4. Create Caller Admin, which becomes the active authenticated admin
  const callerAdminRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const callerAdmin = await api.functional.auth.platformAdmin.join(connection, {
    body: callerAdminRequest,
  });
  typia.assert(callerAdmin);

  // 5. Caller Admin fetches Admin B's profile
  const detail: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: adminB.id,
      },
    );
  typia.assert(detail);

  // 6. Identity assertions: detail must correspond to Admin B
  TestValidator.equals(
    "detail.id should match Admin B id",
    detail.id,
    adminB.id,
  );
  TestValidator.equals(
    "detail.email should match Admin B email",
    detail.email,
    adminB.email,
  );
  TestValidator.equals(
    "detail.displayName should match Admin B displayName",
    detail.displayName,
    adminB.displayName,
  );

  // Ensure retrieved profile does not correspond to the caller admin
  TestValidator.notEquals(
    "detail.id should differ from caller admin id",
    detail.id,
    callerAdmin.id,
  );
  TestValidator.notEquals(
    "detail.email should differ from caller admin email",
    detail.email,
    callerAdmin.email,
  );

  // Lifecycle expectations for a freshly joined admin
  TestValidator.equals(
    "platform admin account should be active",
    detail.isActive,
    true,
  );

  // Newly created admin should not be soft-deleted
  TestValidator.equals(
    "deletedAt should be undefined for active admin",
    detail.deletedAt,
    undefined,
  );
}
