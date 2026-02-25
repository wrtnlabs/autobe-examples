import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingCarrierConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import type { IShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierConfig";
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

export async function test_api_carrier_config_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a new shipping carrier
  const carrierData = {
    code: "fedex" as string & tags.Pattern<"^[a-zA-Z0-9_]+$">,
    name: "FedEx Shipping Service",
    api_endpoint: "https://api.fedex.com/ws" as string & tags.Format<"uri">,
    api_key: typia.random<string>(),
    api_secret: typia.random<string>(),
    is_enabled: true,
  } satisfies IShoppingMallShippingCarrier.ICreate;
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    adminConnection,
    { body: carrierData },
  );
  typia.assert(carrier);
  // 3. Retrieve carrier configurations
  const result =
    await api.functional.shoppingMall.admin.carriers.configs.getByCarrierid(
      adminConnection,
      {
        carrierId: carrier.id,
      },
    );
  typia.assert(result);
  // 4. Validate response structure
  TestValidator.equals("pagination exists", result.pagination, {
    current: 1,
    limit: 10,
    records: 0, // No configs exist initially
    pages: 0,
  });
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  TestValidator.equals("no configs initially", result.data.length, 0);
}
