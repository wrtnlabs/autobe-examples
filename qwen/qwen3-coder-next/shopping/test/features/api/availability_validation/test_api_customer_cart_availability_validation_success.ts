import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_availability_validation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and login as customer using utility function
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // Prepare availability request with product variants (simulating cart items)
  const availabilityRequest: IShoppingMallInventoryHistory.IAvailabilityRequest =
    typia.random<IShoppingMallInventoryHistory.IAvailabilityRequest>();
  // Validate cart availability
  const availabilityResponse: IShoppingMallInventoryHistory.IAvailabilityResponse =
    await api.functional.shoppingMall.customer.availability.validateCartAvailability(
      customerConnection,
      {
        body: availabilityRequest,
      },
    );
  // Assert response structure
  typia.assert(availabilityResponse);
}
