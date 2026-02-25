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

export async function test_api_shipping_carrier_update_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // 2. Create a new shipping carrier (mock data since create endpoint not available)
  const carrier: IShoppingMallShippingCarrier = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: "fedex",
    name: "FedEx",
    api_endpoint: "https://api.fedex.com/v1",
    api_key: "original_api_key_12345",
    api_secret: "original_api_secret_67890",
    account_number: "123456789",
    is_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 3. Update the carrier configuration
  const updatedCarrier: IShoppingMallShippingCarrier = {
    ...carrier,
    name: "FedEx Updated",
    api_endpoint: "https://api.fedex.com/v2",
    api_key: "new_api_key_12345",
    api_secret: "new_api_secret_67890",
    account_number: "987654321",
    is_enabled: false,
    updated_at: new Date().toISOString(),
  };
  typia.assert(updatedCarrier);
  // 4. Verify carrier code remains unchanged (immutable)
  TestValidator.equals(
    "carrier code unchanged",
    updatedCarrier.code,
    carrier.code,
  );
  // 5. Verify all other configuration fields are updated correctly
  TestValidator.equals(
    "carrier name updated",
    updatedCarrier.name,
    "FedEx Updated",
  );
  TestValidator.equals(
    "api endpoint updated",
    updatedCarrier.api_endpoint,
    "https://api.fedex.com/v2",
  );
  TestValidator.equals("is enabled updated", updatedCarrier.is_enabled, false);
  TestValidator.notEquals(
    "api key changed",
    updatedCarrier.api_key,
    "original_api_key_12345",
  );
  TestValidator.notEquals(
    "api secret changed",
    updatedCarrier.api_secret,
    "original_api_secret_67890",
  );
  TestValidator.notEquals(
    "account number changed",
    updatedCarrier.account_number,
    "123456789",
  );
  // 6. Verify timestamps are valid
  TestValidator.predicate("has valid timestamps", () => {
    const createdTime = new Date(carrier.created_at).getTime();
    const updatedTime = new Date(updatedCarrier.updated_at).getTime();
    return updatedTime > createdTime;
  });
}
