import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the edge case where attempting to promote an administrator who is already a super administrator should fail.
 *
 * This test validates the business rule that only regular administrators can be promoted to super administrator grade. The test creates administrator accounts and performs a promotion workflow to verify that the system correctly rejects attempts to promote an administrator who already has super administrator privileges.
 *
 * This validation prevents unnecessary database updates, maintains audit trail integrity, and ensures the promotion endpoint enforces proper state transitions.
 *
 * 1. Create and authenticate as a super administrator (the caller who performs promotions).
 * 2. Create a regular administrator account (the target to be promoted).
 * 3. Promote the regular administrator to super administrator grade (first promotion succeeds).
 * 4. Attempt to promote the same administrator again (now already super).
 * 5. Verify the second promotion attempt fails with an appropriate error.
 */
export async function test_api_administrator_promotion_already_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator (caller)
  // Note: In a real scenario, we would need a pre-existing super admin or a bootstrap mechanism
  // For this test, we create an admin and assume it has super privileges through external setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SecurePass123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "192.168.1.100",
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator (target)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: "regularadmin@test.com",
        password: "SecurePass456",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.101",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdmin);
  // 3. First promotion: regular admin -> super admin (should succeed)
  // This assumes superAdmin has super privileges to perform the promotion
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
      },
    );
  typia.assert(promotedAdmin);
  // Verify the promotion was successful
  TestValidator.equals(
    "grade after first promotion",
    promotedAdmin.grade,
    "super",
  );
  // 4. Second promotion attempt: already super admin -> super admin (should fail)
  await TestValidator.error(
    "cannot promote already super administrator",
    async () => {
      await api.functional.shoppingMall.administrator.administrators.promote(
        superAdminConnection,
        {
          administratorId: regularAdmin.id,
        },
      );
    },
  );
}
