import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_visibility(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that regular administrators can view super administrator profiles,
   * validating the platform-wide visibility rule for administrators.
   *
   * This test validates that:
   * - Regular admins have read access to super admin accounts
   * - Grade field is visible in profile responses
   * - Cross-grade visibility works correctly
   */
  // 1. Create first administrator (assumed to be super via bootstrap mechanism)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Create second administrator (regular viewer)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(regularAdminConnection, {});
  // 3. Create third administrator to be promoted to super
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_administrator_join(targetConnection, {});
  // 4. First admin promotes target admin to super
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: targetAdmin.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 5. Regular admin views the promoted super admin's profile
  const viewedAdmin =
    await api.functional.shoppingMall.administrator.administrators.at(
      regularAdminConnection,
      { administratorId: promotedAdmin.id },
    );
  typia.assert(viewedAdmin);
  // 6. Validate cross-grade visibility
  TestValidator.equals(
    "super admin id visible",
    viewedAdmin.id,
    promotedAdmin.id,
  );
  TestValidator.equals(
    "super admin email visible",
    viewedAdmin.email,
    promotedAdmin.email,
  );
  TestValidator.equals("grade field shows super", viewedAdmin.grade, "super");
}
