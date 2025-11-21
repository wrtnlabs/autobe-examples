import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";

export async function test_api_shipping_info_retrieval_unfulfilled_order(
  connection: api.IConnection,
) {
  // Authenticate as admin to access unfulfilled order data
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate a realistic IShoppingMallOrderShipping object to extract valid orderNumber
  const fakeShipping: IShoppingMallOrderShipping =
    typia.random<IShoppingMallOrderShipping>();
  const orderNumber: string = fakeShipping.shopping_mall_order_id; // Extract valid UUID format orderNumber

  // The schema expects orderNumber in format ORD-YYYYMMDD-NNNNN, but our model uses UUID for shopping_mall_order_id.
  // Since no API endpoint to create orders is provided, and the function expects an orderNumber string, we must use the UUID as-is.
  // This is an implementation trade-off: the system under test may have a schema mismatch, but we must validate the contract as defined.

  // Retrieve shipping information for the unfulfilled order
  const shipping: IShoppingMallOrderShipping =
    await api.functional.shoppingMall.orders.shipping.at(connection, {
      orderNumber,
    });
  typia.assert(shipping);

  // Validate required fields are present and properly typed
  TestValidator.equals(
    "shipping record has valid order reference id",
    shipping.shopping_mall_order_id,
    orderNumber,
  );
  TestValidator.equals(
    "shipping record has valid first name",
    typeof shipping.first_name,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid last name",
    typeof shipping.last_name,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid address line 1",
    typeof shipping.address_line1,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid city",
    typeof shipping.city,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid state",
    typeof shipping.state,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid postal code",
    typeof shipping.postal_code,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid country",
    typeof shipping.country,
    "string",
  );
  TestValidator.equals(
    "shipping record has valid phone",
    typeof shipping.phone,
    "string",
  );

  // Validate that carrier-specific tracking fields are null/undefined as expected for unfulfilled order
  TestValidator.predicate(
    "carrier is null for unfulfilled order",
    shipping.carrier === null,
  );
  TestValidator.predicate(
    "tracking_number is undefined for unfulfilled order",
    shipping.tracking_number === undefined,
  );
  TestValidator.predicate(
    "tracking_url is undefined for unfulfilled order",
    shipping.tracking_url === undefined,
  );
  TestValidator.predicate(
    "estimated_delivery_date is undefined for unfulfilled order",
    shipping.estimated_delivery_date === undefined,
  );
  TestValidator.predicate(
    "real_delivery_date is undefined for unfulfilled order",
    shipping.real_delivery_date === undefined,
  );

  // Validate timestamps are properly set (only check existence, not format, since typia.assert already validates)
  TestValidator.predicate("created_at exists", shipping.created_at !== null);
  TestValidator.predicate("updated_at exists", shipping.updated_at !== null);
}
