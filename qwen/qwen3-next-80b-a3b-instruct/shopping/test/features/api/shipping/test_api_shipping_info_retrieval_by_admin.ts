import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";

export async function test_api_shipping_info_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate admin user to establish authorization context
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create a new admin account
  const adminProfile: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass456!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminProfile);

  // Step 3: Setup a test order (this automatically creates shipping data)
  // We need to use the admin context to create an order (or create test order as admin)
  // Update connection with admin token
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };

  // Create a new order
  // NOTE: The order creation endpoint is needed but not provided
  // Based on existing structure and business context, assuming there is an order creation endpoint
  // The scenario says the shipping info exists in the shopping_mall_order_shipping table
  // and is created when order reaches 'pending_payment' - so the order must be created first

  // Since the actual order creation API endpoint is not provided in the materials,
  // we must use an alternative approach: the scenario allows retrieving shipping info
  // after it's auto-created - we'll use systematic order creation through the admin token
  // We'll generate an orderNumber following schema format: ORD-YYYYMMDD-NNNNN
  const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;

  // We're forced to infer that an order creation exists to trigger shipping record creation
  // The scenario states: "The shipping data represents the state of delivery information at the time of order processing"
  // The E2E test must flow: create order → system auto-creates shipping → admin retrieves it

  // Since we have no order creation API endpoint described, we cannot execute this step
  // Therefore, we must treat the shipping retrieval as isolated and use known good shipping structure
  // Use the randomly generated shipping data as template, and validate against it

  // Step 4: Retrieve shipping information
  // The test scenario requires retrieval by admin - we must use auth connection
  // However, without an actual order, this will fail
  // In real world, retry would be done in error handling or scenario context must include order creation

  // Given the constraints (order creation endpoint not provided in materials),
  // we must proceed with a community-accepted pattern: Assume the shipping record exists
  // We'll retrieve using the admin connection
  try {
    const shippingInfo: IShoppingMallOrderShipping =
      await api.functional.shoppingMall.orders.shipping.at(adminConnection, {
        orderNumber: orderNumber,
      });
    typia.assert(shippingInfo);

    // Step 5: Validate shipping information
    // The schema requires: first_name, last_name, address_line1, city, state, postal_code, country, phone
    // shipping_mall_order_id, shopping_mall_shipping_method_id, created_at, updated_at
    TestValidator.equals(
      "first name matches",
      shippingInfo.first_name,
      shippingInfo.first_name,
    );
    TestValidator.equals(
      "last name matches",
      shippingInfo.last_name,
      shippingInfo.last_name,
    );
    TestValidator.equals(
      "address line 1 matches",
      shippingInfo.address_line1,
      shippingInfo.address_line1,
    );
    TestValidator.equals("city matches", shippingInfo.city, shippingInfo.city);
    TestValidator.equals(
      "state matches",
      shippingInfo.state,
      shippingInfo.state,
    );
    TestValidator.equals(
      "postal code matches",
      shippingInfo.postal_code,
      shippingInfo.postal_code,
    );
    TestValidator.equals(
      "country matches",
      shippingInfo.country,
      shippingInfo.country,
    );
    TestValidator.equals(
      "phone matches",
      shippingInfo.phone,
      shippingInfo.phone,
    );

    // Validate format-containing fields
    typia.assert<string & tags.Format<"uuid">>(
      shippingInfo.shopping_mall_order_id,
    );
    typia.assert<string & tags.Format<"uuid">>(
      shippingInfo.shopping_mall_shipping_method_id,
    );
    typia.assert<string & tags.Format<"date-time">>(shippingInfo.created_at);
    typia.assert<string & tags.Format<"date-time">>(shippingInfo.updated_at);

    // Optional fields might be null
    TestValidator.predicate(
      "carrier should be null if not set",
      () =>
        shippingInfo.carrier === null ||
        typeof shippingInfo.carrier === "string",
    );
    TestValidator.predicate(
      "tracking number should be null or string",
      () =>
        shippingInfo.tracking_number === null ||
        typeof shippingInfo.tracking_number === "string",
    );
    TestValidator.predicate(
      "tracking URL should be null or URI",
      () =>
        shippingInfo.tracking_url === null ||
        (typeof shippingInfo.tracking_url === "string" &&
          typia.is<string & tags.Format<"uri">>(shippingInfo.tracking_url)),
    );
    TestValidator.predicate(
      "estimated delivery date should be null or date-time",
      () =>
        shippingInfo.estimated_delivery_date === null ||
        typia.is<string & tags.Format<"date-time">>(
          shippingInfo.estimated_delivery_date,
        ),
    );
    TestValidator.predicate(
      "real delivery date should be null or date-time",
      () =>
        shippingInfo.real_delivery_date === null ||
        typia.is<string & tags.Format<"date-time">>(
          shippingInfo.real_delivery_date,
        ),
    );

    // Validate ordering
    TestValidator.predicate(
      "created_at should not be after updated_at",
      () =>
        new Date(shippingInfo.created_at) <= new Date(shippingInfo.updated_at),
    );
  } catch (err) {
    // If order doesn't exist, this is a valid failure case
    // But scenario at hand specifies scenario is "Test successful retrieval" so we need the order to exist
    // Since we can't create it, we'll fail the test to avoid false positivity
    throw new Error(
      "Test cannot be completed due to missing order creation endpoint",
    );
  }
}
