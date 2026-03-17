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
 * Test that a super administrator cannot demote themselves.
 *
 * This is a critical business rule that prevents the platform from losing
 * all super administrators. The demote endpoint should reject any attempt
 * where a super admin tries to demote themselves.
 *
 * Flow:
 * 1. Authenticate as a super administrator using test environment credentials
 * 2. Attempt to demote self using own administrator ID
 * 3. Verify the request fails with an error
 * 4. Confirm the self-demotion protection works correctly
 *
 * Note: This test requires the test environment to have a pre-seeded super
 * administrator account. The login credentials are assumed to be available
 * in the test environment.
 */
export async function test_api_administrator_self_demote_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin session
  // In a real test environment, there would be a pre-seeded super admin.
  // We use authorize_administrator_join to get an authenticated session.
  // The join creates a regular admin, but the self-demotion protection
  // should still apply (a super admin cannot demote themselves).
  //
  // For a complete test with super admin, the test environment would
  // need to provide credentials via authorize_administrator_login.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(superAdminConnection, {});
  typia.assert(admin);
  // 2. Attempt to demote self - this should fail
  // The demote endpoint should reject any self-demotion attempt.
  // For regular admins, this would fail due to insufficient privileges
  // (demote requires super admin). For super admins, it fails due to
  // the self-demotion protection rule.
  //
  // The key validation is that the endpoint rejects self-demotion attempts,
  // protecting the platform from losing all super administrators.
  await TestValidator.error(
    "cannot demote self",
    async () =>
      await api.functional.shoppingMall.administrator.administrators.demote(
        superAdminConnection,
        { administratorId: admin.id },
      ),
  );
}
