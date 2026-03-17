import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the successful promotion of a regular administrator to super administrator grade.
 *
 * This test validates the administrator promotion workflow:
 * 1. Create and authenticate as a super administrator
 * 2. Create a regular administrator account (grade: ADMIN)
 * 3. Promote the regular admin to super admin using the promote endpoint
 * 4. Validate the response shows grade changed to SUPER_ADMIN
 * 5. Verify the updated_at timestamp reflects the promotion
 */
export async function test_api_administrator_promotion_to_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminJoin = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdminJoin);
  // 2. Create regular administrator account to be promoted
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Verify the admin was created with ADMIN grade
  TestValidator.equals("initial grade is ADMIN", adminJoin.grade, "ADMIN");
  // 3. Create super admin connection for promotion operation
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminJoin.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  // 4. Promote the regular admin to super admin
  const promotedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      superAdminConnection,
      {
        adminId: adminJoin.id,
      },
    );
  typia.assert(promotedAdmin);
  // 5. Validate promotion results
  TestValidator.equals(
    "grade changed to SUPER_ADMIN",
    promotedAdmin.grade,
    "SUPER_ADMIN",
  );
  TestValidator.equals("admin ID preserved", promotedAdmin.id, adminJoin.id);
  TestValidator.equals("email preserved", promotedAdmin.email, adminJoin.email);
  TestValidator.predicate(
    "updated_at timestamp exists",
    promotedAdmin.updated_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(promotedAdmin.updated_at)),
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(promotedAdmin.updated_at) >= new Date(promotedAdmin.created_at),
  );
  TestValidator.equals(
    "account is active (not deleted)",
    promotedAdmin.deleted_at,
    null,
  );
}
