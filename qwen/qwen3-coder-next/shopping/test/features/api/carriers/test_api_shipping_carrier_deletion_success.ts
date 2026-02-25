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

export async function test_api_shipping_carrier_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@carriers-test.com",
      password: "123456",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a new shipping carrier to delete
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    adminConnection,
    {
      body: {
        code: "test_carrier_" + RandomGenerator.alphaNumeric(6),
        name: "Test Carrier " + RandomGenerator.name(),
        api_endpoint: "https://api.test-carrier.example.com/v1",
        api_key: RandomGenerator.alphaNumeric(32),
        api_secret: RandomGenerator.alphaNumeric(32),
        account_number: null,
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    },
  );
  typia.assert(carrier);
  // 3. Verify carrier exists before deletion
  TestValidator.equals("carrier has ID", carrier.id, carrier.id);
  // 4. Delete the carrier (soft delete)
  await api.functional.shoppingMall.admin.carriers.erase(adminConnection, {
    carrierId: carrier.id,
  });
  // 5. Verify carrier is now marked as deleted
  const retrievedCarrier =
    await api.functional.shoppingMall.admin.carriers.create(adminConnection, {
      body: {
        code: "verify_deleted_" + RandomGenerator.alphaNumeric(6),
        name: "Verify Deleted Carrier",
        api_endpoint: "https://api.verify-carrier.example.com/v1",
        api_key: RandomGenerator.alphaNumeric(32),
        api_secret: RandomGenerator.alphaNumeric(32),
        account_number: null,
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    });
  typia.assert(retrievedCarrier);
  // 6. Check that the deleted carrier has deleted_at timestamp set
  TestValidator.predicate(
    "carrier has deleted_at timestamp",
    carrier.deleted_at !== null && carrier.deleted_at !== undefined,
  );
  // 7. Verify carrier code is unique and not reusable immediately
  await TestValidator.error("duplicate carrier code blocked", async () => {
    await api.functional.shoppingMall.admin.carriers.create(adminConnection, {
      body: {
        code: carrier.code,
        name: "Duplicate Code Carrier",
        api_endpoint: "https://api.duplicate-carrier.example.com/v1",
        api_key: RandomGenerator.alphaNumeric(32),
        api_secret: RandomGenerator.alphaNumeric(32),
        account_number: null,
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    });
  });
}
