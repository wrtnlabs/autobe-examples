import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { prepare_random_shopping_mall_shipping_carrier } from "../../../prepare/prepare_random_shopping_mall_shipping_carrier";

export async function test_api_admin_carrier_registration_with_account_number(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Register a carrier with account number
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    adminConnection,
    {
      body: {
        code: "dhl" as string & tags.Pattern<"^[a-zA-Z0-9_]+$">,
        name: "DHL Express",
        api_endpoint: "https://api.dhl.com/ws" as string & tags.Format<"uri">,
        api_key: "dhl_api_key_12345",
        api_secret: "dhl_api_secret_67890",
        account_number: "123456789",
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    },
  );
  typia.assert(carrier);
  // Validate carrier was created with account number
  TestValidator.equals("carrier code matches", carrier.code, "dhl");
  TestValidator.equals("carrier name matches", carrier.name, "DHL Express");
  TestValidator.equals(
    "account number preserved",
    carrier.account_number,
    "123456789",
  );
  TestValidator.predicate("carrier enabled", carrier.is_enabled === true);
}
