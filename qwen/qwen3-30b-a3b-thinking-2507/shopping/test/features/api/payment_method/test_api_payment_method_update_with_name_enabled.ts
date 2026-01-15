import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { prepare_random_shopping_mall_payment_method } from "../../../prepare/prepare_random_shopping_mall_payment_method";
import { generate_random_shopping_mall_admin_payments_methods_create } from "../../../generate/generate_random_shopping_mall_admin_payments_methods_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_method_update_with_name_enabled(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "password",
      name: "admin",
    },
  });
  // Step 2: Create a payment method to update
  const method =
    await generate_random_shopping_mall_admin_payments_methods_create(
      adminConnection,
      {
        body: {
          provider: "stripe",
          enabled: true,
        },
      },
    );
  // Step 3: Update the payment method with new name and enabled status
  const updated =
    await api.functional.shoppingMall.admin.payments.methods.update(
      adminConnection,
      {
        methodId: method.id,
        body: {
          name: "Updated Name",
          enabled: false,
        },
      },
    );
  // Step 4: Validate the update
  TestValidator.equals("name updated", updated.name, "Updated Name");
  TestValidator.equals("enabled status updated", updated.enabled, false);
}
