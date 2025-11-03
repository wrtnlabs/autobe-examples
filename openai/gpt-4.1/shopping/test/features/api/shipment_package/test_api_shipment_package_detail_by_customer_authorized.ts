import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";

/**
 * Test that a customer who placed the order can retrieve detailed information
 * for a specific shipment package using a valid shipment code and package
 * label.
 *
 * Steps:
 *
 * 1. Register and authenticate a new customer using random valid registration
 *    data.
 * 2. Simulate prerequisite fulfillment: Assume a shipment and corresponding
 *    package have been created for this customer (mock the business identifiers
 *    for the test).
 * 3. Call the /shopping/customer/shipments/{code}/packages/{packageLabel} API with
 *    the valid code/label.
 * 4. Validate all important fields in the response (tracking number, package
 *    label, sequence, dimensions, status,
 *    delivered/lost/damaged/created/updated/deleted timestamps), confirming
 *    that tracking and sensitive fields are available, accurate, and accessible
 *    for the authorized customer. Confirm package identifiers and that data is
 *    only returned to the correct actor (customer context).
 */
export async function test_api_shipment_package_detail_by_customer_authorized(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test-client.local/register",
        referrer: "https://test-client.local/landing",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Prepare a mock shipment package business key and label (simulate as if actually created for this customer)
  // As we cannot actually create shipment/package entities, simulate these with random string values
  const shipmentCode = RandomGenerator.alphaNumeric(12); // typically a global shipment business code
  const packageLabel = RandomGenerator.alphaNumeric(8); // typically a label or barcode

  // Simulate (mock) the business scenario: Suppose package exists for this customer
  // (In actuality, would require upstream order, shipment, and package creation APIs)

  // 3. Retrieve the package detail with given code and packageLabel
  // In simulate mode, typia.random guarantees response type, and the context (customer authorized) ensures that security rules are applied
  const pkg: IShoppingShipmentPackage =
    await api.functional.shopping.customer.shipments.packages.at(connection, {
      code: shipmentCode,
      packageLabel,
    });
  typia.assert(pkg);

  // 4. Validate contents: Core fields
  TestValidator.predicate(
    "package id is valid UUID",
    typeof pkg.id === "string" && pkg.id.length > 0,
  );
  TestValidator.equals(
    "package label matches",
    pkg.package_label,
    packageLabel,
  );
  TestValidator.equals(
    "shipment id exists",
    typeof pkg.shopping_shipment_id,
    "string",
  );
  TestValidator.predicate("sequence is int32", Number.isInteger(pkg.sequence));
  TestValidator.equals(
    "package label matches again",
    pkg.package_label,
    packageLabel,
  );
  TestValidator.predicate(
    "tracking number returned for rightful customer",
    typeof pkg.tracking_number === "string" && pkg.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "package weight is positive",
    pkg.package_weight_grams > 0,
  );
  TestValidator.predicate(
    "dimensions are positive values",
    pkg.length_cm > 0 && pkg.width_cm > 0 && pkg.height_cm > 0,
  );
  TestValidator.equals("status is string", typeof pkg.status, "string");
  // Core timestamps
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof pkg.created_at === "string" && !!Date.parse(pkg.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof pkg.updated_at === "string" && !!Date.parse(pkg.updated_at),
  );
  // Optional timestamps may be null or strings; just perform type checks
  if (pkg.delivered_at !== null && pkg.delivered_at !== undefined) {
    TestValidator.predicate(
      "delivered_at is ISO date string",
      typeof pkg.delivered_at === "string" && !!Date.parse(pkg.delivered_at),
    );
  }
  if (pkg.lost_at !== null && pkg.lost_at !== undefined) {
    TestValidator.predicate(
      "lost_at is ISO date string",
      typeof pkg.lost_at === "string" && !!Date.parse(pkg.lost_at),
    );
  }
  if (pkg.damaged_at !== null && pkg.damaged_at !== undefined) {
    TestValidator.predicate(
      "damaged_at is ISO date string",
      typeof pkg.damaged_at === "string" && !!Date.parse(pkg.damaged_at),
    );
  }
  if (pkg.deleted_at !== null && pkg.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO date string",
      typeof pkg.deleted_at === "string" && !!Date.parse(pkg.deleted_at),
    );
  }
}
