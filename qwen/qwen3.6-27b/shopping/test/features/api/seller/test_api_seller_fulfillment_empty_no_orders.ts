import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test empty fulfillment response for newly approved seller with no orders.
 *
 * Validates that a seller account that has been approved but has not yet received any customer orders returns a properly structured empty paginated response. This ensures the API gracefully handles the edge case of no fulfillment data rather than throwing errors.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller calls the fulfillment endpoint with default pagination parameters.
 * 3. Response validates an empty data array with correct pagination metadata showing zero records and zero pages.
 * 4. Confirms the endpoint returns successfully without errors for sellers awaiting their first orders.
 */
export async function test_api_seller_fulfillment_empty_no_orders(
  connection: api.IConnection,
) {
  // 1. Seller authentication setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 2. Call fulfillment endpoint with default request body
  const fulfillmentResponse =
    await api.functional.ecommercePlatform.seller.orders.fulfillment.index(
      sellerConnection,
      {
        body: {} satisfies IEcommercePlatformOrder.IFulfillmentRequest,
      },
    );
  typia.assert(fulfillmentResponse);
  // 3. Validate empty data array
  TestValidator.equals(
    "data array is empty",
    fulfillmentResponse.data.length,
    0,
  );
  // 4. Validate pagination metadata
  TestValidator.equals(
    "zero records returned",
    fulfillmentResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages returned",
    fulfillmentResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    fulfillmentResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is valid positive number",
    fulfillmentResponse.pagination.limit > 0,
  );
}
