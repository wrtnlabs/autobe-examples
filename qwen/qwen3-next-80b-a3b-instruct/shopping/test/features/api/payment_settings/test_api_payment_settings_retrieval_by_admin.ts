import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettings";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_settings_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminProfile = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminProfile);
  // Step 2: Establish a payment setting ID that will be used for retrieval
  const paymentSettingId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify successful retrieval with valid authentication
  const paymentSettings =
    await api.functional.shoppingMall.admin.payment_settings.at(
      adminConnection,
      { settingId: paymentSettingId },
    );
  typia.assert(paymentSettings);
  // Step 4: Verify authentication failure without proper credentials (unauthenticated access)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated admin request should fail with 401",
    async () => {
      await api.functional.shoppingMall.admin.payment_settings.at(
        guestConnection,
        { settingId: paymentSettingId },
      );
    },
  );
}
