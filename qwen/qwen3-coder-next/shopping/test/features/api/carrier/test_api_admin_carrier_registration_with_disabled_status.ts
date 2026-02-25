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

export async function test_api_admin_carrier_registration_with_disabled_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!" satisfies string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorizedAdmin);
  // Create new admin connection with the returned token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedAdmin.token.access,
    },
  };
  // Register a new shipping carrier with is_enabled = false
  const carrierData = {
    code: RandomGenerator.alphabets(6).toLowerCase(),
    name: RandomGenerator.name(2),
    api_endpoint:
      `https://api.${RandomGenerator.alphabets(6)}.com/v1` satisfies string &
        tags.Format<"uri">,
    api_key: RandomGenerator.alphaNumeric(32),
    api_secret: RandomGenerator.alphaNumeric(32),
    account_number: null,
    is_enabled: false,
  } satisfies IShoppingMallShippingCarrier.ICreate;
  const createdCarrier =
    await api.functional.shoppingMall.admin.carriers.create(
      adminAuthConnection,
      {
        body: carrierData,
      },
    );
  typia.assert(createdCarrier);
  // Validate the created carrier
  TestValidator.equals("carrier is disabled", createdCarrier.is_enabled, false);
  TestValidator.equals(
    "carrier code matches",
    createdCarrier.code,
    carrierData.code,
  );
  TestValidator.equals(
    "carrier name matches",
    createdCarrier.name,
    carrierData.name,
  );
  TestValidator.equals(
    "carrier API endpoint matches",
    createdCarrier.api_endpoint,
    carrierData.api_endpoint,
  );
  TestValidator.equals(
    "carrier account_number is null",
    createdCarrier.account_number,
    null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    createdCarrier.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    createdCarrier.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", createdCarrier.deleted_at, null);
  // Verify that carrier can be fetched with disabled status
  const fetchedCarrier =
    await api.functional.shoppingMall.admin.carriers.create(
      adminAuthConnection,
      {
        body: {
          code: RandomGenerator.alphabets(6).toLowerCase(),
          name: RandomGenerator.name(2),
          api_endpoint:
            `https://api.${RandomGenerator.alphabets(6)}.com/v1` satisfies string &
              tags.Format<"uri">,
          api_key: RandomGenerator.alphaNumeric(32),
          api_secret: RandomGenerator.alphaNumeric(32),
          account_number: null,
          is_enabled: false,
        } satisfies IShoppingMallShippingCarrier.ICreate,
      },
    );
  typia.assert(fetchedCarrier);
  TestValidator.equals(
    "fetched carrier is also disabled",
    fetchedCarrier.is_enabled,
    false,
  );
}
