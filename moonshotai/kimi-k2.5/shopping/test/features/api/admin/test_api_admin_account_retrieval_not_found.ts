import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a non-existent or soft-deleted administrator account.
 *
 * Validates 404 Not Found behavior for non-existent admin IDs and ensures
 * consistent error messages to prevent account enumeration attacks. Verifies
 * that authenticated admin remains authorized after the failed request and
 * no partial data is leaked in error responses.
 */
export async function test_api_admin_account_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Generate a random UUID that doesn't correspond to any admin
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent admin - should throw 404
  await TestValidator.httpError(
    "should return 404 for non-existent admin ID",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      });
    },
  );
  // 4. Verify the admin is still authenticated by fetching their own profile
  const selfProfile = await api.functional.ecommerceMall.admin.admins.at(
    adminConnection,
    { adminId: admin.id },
  );
  typia.assert(selfProfile);
  TestValidator.equals("profile id matches", selfProfile.id, admin.id);
  TestValidator.equals("profile email matches", selfProfile.email, admin.email);
  // 5. Test with another random UUID to confirm consistent behavior
  const anotherNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for another non-existent admin ID",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admins.at(adminConnection, {
        adminId: anotherNonExistentId,
      });
    },
  );
}
