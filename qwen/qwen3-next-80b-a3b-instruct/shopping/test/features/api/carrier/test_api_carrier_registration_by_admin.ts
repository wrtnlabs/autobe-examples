import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { prepare_random_shopping_mall_carrier } from "../../../prepare/prepare_random_shopping_mall_carrier";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_carrier_registration_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create carrier configuration with valid data
  const carrierData: IShoppingMallCarrier.ICreate = {
    carrier_name: RandomGenerator.name(),
    carrier_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    delivery_enabled: true,
    max_weight_kg: typia.random<
      number & tags.Minimum<0> & tags.Maximum<10000>
    >(),
    max_volume_m3: typia.random<number & tags.Minimum<0> & tags.Maximum<50>>(),
    estimated_transit_days: typia.random<
      number & tags.Minimum<1> & tags.Maximum<60>
    >(),
    supported_currencies: ArrayUtil.repeat(3, () =>
      RandomGenerator.pick(["USD", "EUR", "JPY", "CAD", "AUD", "GBP"] as const),
    ) as (string & tags.Pattern<"^[A-Z]{3}$">)[],
    api_integration_url: "https://api.example-carrier.com/v1",
    api_key: RandomGenerator.alphaNumeric(64),
    username: undefined,
    password: undefined,
  } satisfies IShoppingMallCarrier.ICreate;
  // Step 3: Create the carrier via the authorized admin connection
  const createdCarrier: IShoppingMallCarrier =
    await generate_random_shopping_mall_admin_carriers_create(adminConnection, {
      body: carrierData,
    });
  typia.assert(createdCarrier);
  // Step 4: Validate the created carrier data matches expected values
  TestValidator.equals(
    "carrier name matches",
    createdCarrier.carrier_name,
    carrierData.carrier_name,
  );
  TestValidator.equals(
    "carrier code matches",
    createdCarrier.carrier_code,
    carrierData.carrier_code satisfies string as string,
  );
  TestValidator.equals(
    "delivery enabled matches",
    createdCarrier.delivery_enabled,
    carrierData.delivery_enabled,
  );
  TestValidator.equals(
    "status is active", createdCarrier.status, "active"
  );
}