import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
export async function test_api_shipping_method_filter_by_service_level(
  connection: api.IConnection,
): Promise<void> {
  // Create unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random request parameters
  const request: IShoppingMallShippingMethod.IRequest = {
    page: 1,
    limit: 25,
    service_level: "expedited",
    is_active: true,
  } satisfies IShoppingMallShippingMethod.IRequest;
  // Call API with filter parameters
  const response: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.shipping_methods.index(guestConnection, {
      body: request,
    });
  // Validate response structure
  typia.assert(response);
  // Validate pagination
  TestValidator.equals("page should be 1", response.pagination.current, 1);
  TestValidator.equals("limit should be 25", response.pagination.limit, 25);
  TestValidator.predicate(
    "records should be at least 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    response.pagination.pages >= 1,
  );
  // Validate that all returned shipping methods have service_level = 'expedited' and is_active = true
  for (const shippingMethod of response.data) {
    TestValidator.equals(
      "service_level should be expedited",
      shippingMethod.service_level,
      "expedited",
    );
    TestValidator.equals(
      "is_active should be true",
      shippingMethod.is_active,
      true,
    );
  }
}
