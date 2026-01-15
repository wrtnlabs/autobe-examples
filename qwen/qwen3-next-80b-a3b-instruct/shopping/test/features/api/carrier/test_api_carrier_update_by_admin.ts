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
import type { IShoppingMallCarrierApiCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrierApiCredentials";
import type { IShoppingMallCarrierServiceLevelAgreements } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrierServiceLevelAgreements";
import { prepare_random_shopping_mall_carrier } from "../../../prepare/prepare_random_shopping_mall_carrier";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_carrier_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  
  // Step 2: Create a carrier record using the admin connection
  const carrier: IShoppingMallCarrier =
    await generate_random_shopping_mall_admin_carriers_create(adminConnection, {
      body: {
        carrier_name: RandomGenerator.name(),
        carrier_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        delivery_enabled: true,
        max_weight_kg: 5000,
        max_volume_m3: 10,
        estimated_transit_days: 5,
        supported_currencies: ["USD"],
        api_integration_url: typia.random<string & tags.Format<"uri">>(),
        api_key: RandomGenerator.alphaNumeric(64),
      } satisfies IShoppingMallCarrier.ICreate,
    });
  typia.assert(carrier);
  
  // Step 3: Update the carrier with new information
  // Note: IShoppingMallCarrier.IUpdate uses 'name' not 'carrier_name', 'service_regions' not 'service_areas'
  // CORRECTION: The update body uses correct IUpdate fields, but carrier response uses 'carrier_id' and 'carrier_name' and 'service_areas'
  const updatedCarrier: IShoppingMallCarrier =
    await api.functional.shoppingMall.admin.carriers.update(adminConnection, {
      carrierId: carrier.carrier_code, // FIXED: Use carrier_code instead of non-existent carrier_id
      body: {
        carrier_code: carrier.carrier_code, // Must be provided in IUpdate
        service_capabilities: [],         // Required field in IUpdate - empty array as minimum
        name: "Updated Carrier Name",
        service_regions: ["US", "CA", "MX"],
        status: "active",
      } satisfies IShoppingMallCarrier.IUpdate,
    });
  typia.assert(updatedCarrier);
  
  // Step 4: Validate the update response
  // CORRECTION: Properties of update response are 'carrier_name', not 'name'; 'service_areas', not 'service_regions'; 'status' is correct
  TestValidator.equals(
    "carrier name updated",
    updatedCarrier.carrier_name, // Fixed: use carrier_name from IShoppingMallCarrier
    "Updated Carrier Name",
  );
  TestValidator.equals(
    "service regions updated",
    updatedCarrier.service_areas, // Fixed: use service_areas as per error hint
    ["US", "CA", "MX"],
  );
  TestValidator.equals("status updated", updatedCarrier.status, "active");
}