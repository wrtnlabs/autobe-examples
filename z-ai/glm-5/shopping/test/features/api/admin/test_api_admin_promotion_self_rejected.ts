import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the self-promotion prevention business rule.
 *
 * This test validates that an administrator cannot promote their own account.
 * The system should reject self-promotion attempts with an appropriate error.
 *
 * Test Flow:
 * 1. Create an admin account
 * 2. Attempt to promote the same admin using their own ID
 * 3. Verify the request is rejected with appropriate error (400 or 403)
 *
 * Note: A regular admin gets 403 (not authorized to promote), while a super admin
 * attempting self-promotion would get 400 (self-promotion prevented).
 */
export async function test_api_admin_promotion_self_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Create an admin account
  const admin = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Attempt self-promotion: admin tries to promote themselves
  // This should be rejected:
  // - 403 Forbidden if the admin is not a super admin (unauthorized)
  // - 400 Bad Request if the admin is a super admin (self-promotion prevented)
  await TestValidator.httpError(
    "self-promotion should be rejected",
    [400, 403],
    async () => {
      await api.functional.shoppingMall.admin.admins.promote(adminConnection, {
        adminId: admin.id,
        body: {
          reason: "Attempting self-promotion which should be blocked",
        } satisfies IShoppingMallAdmin.IPromote,
      });
    },
  );
}
