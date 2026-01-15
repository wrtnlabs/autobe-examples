import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_account_deactivation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first administrator account (deactivating admin)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    admin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin1);
  // Step 2: Create second administrator account (to be deactivated)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    admin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin2);
  // Step 3: Use first admin's connection to deactivate the second admin
  const deactivationReason = "Employee terminated";
  const response: IShoppingMallAdmin.IAccountStatusUpdate =
    await api.functional.auth.admin.account.deactivate.deactivateAccount(
      admin1Connection,
      {
        id: admin2.id,
        body: {
          reason: deactivationReason,
        } satisfies IShoppingMallAdmin.IDeactivateAccount,
      },
    );
  typia.assert(response);
  // Step 4: Verify the response contains is_active=false
  TestValidator.equals(
    "deactivated account is_active status",
    response.is_active,
    false,
  );
}
