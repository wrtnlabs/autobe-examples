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

export async function test_api_admin_carrier_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "1234",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Register a new shipping carrier
  const carrierBody = {
    code: "fedex",
    name: "FedEx",
    api_endpoint: "https://api.fedex.com/ws",
    api_key: "test_api_key_12345",
    api_secret: "test_api_secret_67890",
    account_number: "123456789",
    is_enabled: true,
  } satisfies IShoppingMallShippingCarrier.ICreate;
  const createdCarrier =
    await api.functional.shoppingMall.admin.carriers.create(adminConnection, {
      body: carrierBody,
    });
  typia.assert(createdCarrier);
  // Validate carrier properties
  TestValidator.equals("carrier code matches", createdCarrier.code, "fedex");
  TestValidator.equals("carrier name matches", createdCarrier.name, "FedEx");
  TestValidator.equals(
    "API endpoint matches",
    createdCarrier.api_endpoint,
    "https://api.fedex.com/ws",
  );
  TestValidator.equals("is_enabled is true", createdCarrier.is_enabled, true);
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(createdCarrier.id),
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    createdCarrier.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    createdCarrier.updated_at !== undefined,
  );
  TestValidator.equals(
    "account_number matches",
    createdCarrier.account_number,
    "123456789",
  );
}