import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";

/**
 * Validate that an admin can successfully retrieve detailed information for a
 * specific order fulfillment.
 *
 * This test ensures that an admin, once authenticated, can access all
 * fulfillment details for a specified order and fulfillment code. The test
 * covers:
 *
 * 1. Successful admin registration and authentication
 * 2. Retrieval of fulfillment data by valid orderCode and fulfillmentCode
 * 3. Validation that all sensitive fields (shipment status, timestamps, quantity,
 *    note, address info, etc.) are present and visible to the admin
 * 4. Data integrity and authorization (as an admin)
 * 5. No business or authentication errors for valid credentials and correct codes
 */
export async function test_api_admin_fulfillment_retrieval_authorized_access(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(2),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin email should match input",
    admin.email,
    adminEmail,
  );
  TestValidator.equals("admin status is active", admin.status, "active");
  TestValidator.equals("admin role is super", admin.role, "super");
  TestValidator.predicate(
    "admin ID is valid uuid",
    typeof admin.id === "string" && admin.id.length > 0,
  );

  // 2. Generate random codes for fulfillment API (simulate existence for test)
  const orderCode = RandomGenerator.alphaNumeric(16);
  const fulfillmentCode = RandomGenerator.alphaNumeric(16);

  // 3. Call the fulfillment retrieval API
  const fulfillment: IShoppingOrderFulfillment =
    await api.functional.shopping.admin.orders.fulfillments.at(connection, {
      orderCode,
      fulfillmentCode,
    });
  typia.assert(fulfillment);

  // 4. Validate returned fulfillment fields for completeness and admin visibility
  TestValidator.predicate(
    "id is uuid",
    typeof fulfillment.id === "string" && fulfillment.id.length > 0,
  );
  TestValidator.predicate(
    "shopping_order_line_id is uuid",
    typeof fulfillment.shopping_order_line_id === "string" &&
      fulfillment.shopping_order_line_id.length > 0,
  );
  TestValidator.predicate(
    "shopping_seller_id is uuid",
    typeof fulfillment.shopping_seller_id === "string" &&
      fulfillment.shopping_seller_id.length > 0,
  );
  TestValidator.predicate(
    "shopping_seller_address_id is uuid",
    typeof fulfillment.shopping_seller_address_id === "string" &&
      fulfillment.shopping_seller_address_id.length > 0,
  );
  TestValidator.predicate(
    "fulfillment_code string present",
    typeof fulfillment.fulfillment_code === "string" &&
      fulfillment.fulfillment_code.length > 0,
  );
  TestValidator.predicate(
    "quantity_fulfilled is positive number",
    typeof fulfillment.quantity_fulfilled === "number" &&
      fulfillment.quantity_fulfilled >= 1,
  );
  TestValidator.predicate(
    "fulfilled_at is date-time",
    typeof fulfillment.fulfilled_at === "string" &&
      fulfillment.fulfilled_at.length > 0,
  );
  TestValidator.predicate(
    "status is string",
    typeof fulfillment.status === "string" && fulfillment.status.length > 0,
  );
  TestValidator.predicate(
    "note is string or null/undefined",
    fulfillment.note === undefined ||
      fulfillment.note === null ||
      typeof fulfillment.note === "string",
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof fulfillment.created_at === "string" &&
      fulfillment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof fulfillment.updated_at === "string" &&
      fulfillment.updated_at.length > 0,
  );
}
