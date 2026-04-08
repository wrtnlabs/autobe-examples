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
 * Test the primary success path for promoting a regular administrator to super administrator grade.
 *
 * Validates the complete administrator promotion workflow where a super administrator elevates a regular administrator's privilege level. The test creates two administrator accounts, authenticates both, performs the promotion operation, and verifies the grade change was successful.
 *
 * Special attention is given to verifying that the promoted administrator's grade field is updated to 'super' and that the updated_at timestamp reflects the modification. This ensures the promotion operation correctly modifies the administrator record and maintains audit trail integrity.
 *
 * 1. Create and authenticate as a super administrator (the caller performing promotion).
 * 2. Create and authenticate as a regular administrator (the target to be promoted).
 * 3. Call the promote endpoint using the super administrator's connection with the target administrator's ID.
 * 4. Verify the response returns the updated administrator record with grade='super'.
 * 5. Verify the updated_at timestamp was modified from the original creation time.
 */
export async function test_api_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator (caller)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SuperAdmin123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "192.168.1.100",
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate regular administrator (target)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: "regularadmin@test.com",
        password: "RegularAdmin123",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.101",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdmin);
  // Store original updated_at for comparison
  const originalUpdatedAt = regularAdmin.updated_at;
  // 3. Promote regular administrator to super administrator
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Verify grade was updated to 'super'
  TestValidator.equals("grade updated to super", promotedAdmin.grade, "super");
  // 5. Verify updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    promotedAdmin.updated_at,
  );
  // 6. Verify other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    promotedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.equals("id unchanged", promotedAdmin.id, regularAdmin.id);
  TestValidator.equals(
    "banned status unchanged",
    promotedAdmin.banned,
    regularAdmin.banned,
  );
  TestValidator.equals(
    "created_at unchanged",
    promotedAdmin.created_at,
    regularAdmin.created_at,
  );
}
