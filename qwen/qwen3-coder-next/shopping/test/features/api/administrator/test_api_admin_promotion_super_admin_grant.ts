import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promotion_super_admin_grant(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account
  const superAdminEmail = `superadmin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const superAdminPassword = "TestPassword123!";
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create regular administrator account
  const regularAdminEmail = `regularadmin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const regularAdminPassword = "TestPassword123!";
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: regularAdminEmail,
      password: regularAdminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 3: Login as regular administrator to get their ID
  const regularAdminLoginResult = await authorize_admin_login(
    regularAdminConnection,
    {
      body: {
        email: regularAdminEmail,
        password: regularAdminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(regularAdminLoginResult);
  const regularAdminId = regularAdminLoginResult.id;
  // Step 4: Login as super administrator
  const superAdminLoginResult = await authorize_admin_login(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(superAdminLoginResult);
  // Step 5: Super administrator promotes regular administrator
  const promotionReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotedAdmin =
    await api.functional.shoppingMall.admin.administrators.promote(
      superAdminConnection,
      {
        adminId: regularAdminId,
        body: {
          reason: promotionReason,
        } satisfies IShoppingMallAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // Step 6: Validate promotion results
  TestValidator.equals(
    "promotion reason matches",
    promotedAdmin.reason,
    promotionReason,
  );
  TestValidator.equals("status is pending", promotedAdmin.status, "pending");
  TestValidator.predicate(
    "timestamp exists",
    typeof promotedAdmin.created_at === "string",
  );
}