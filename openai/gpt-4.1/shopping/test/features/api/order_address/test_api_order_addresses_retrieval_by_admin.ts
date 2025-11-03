import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderAddress";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";

/**
 * Validate that an administrator can retrieve all shipping and billing
 * addresses associated with any order in the system.
 *
 * The test covers registering a new admin, then retrieving an order's address
 * list through the admin order address endpoint. It checks that the returned
 * list contains valid address summaries (of all types) with unrestricted access
 * and is suitable for audit/compliance needs.
 *
 * Scenario Steps:
 *
 * 1. Register a new admin account and authenticate.
 * 2. Assume an order code exists (random string for test).
 * 3. Retrieve all addresses for the order as the admin using the appropriate API.
 * 4. Assert the response is a valid paginated list and each item has required
 *    address fields.
 */
export async function test_api_order_addresses_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminRole = "super";
  const adminStatus = "active";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: adminRole,
      status: adminStatus,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Use a random order code as test input (real order assumed to exist in integration)
  const orderCode = RandomGenerator.alphaNumeric(10);

  // 3. Compose a basic address request - get all types, first page, default limit
  const requestBody = {
    page: 1 as number,
    limit: 20 as number,
  } satisfies IShoppingOrderAddress.IRequest;

  // 4. Fetch all addresses for the order as admin
  const addressPage =
    await api.functional.shopping.admin.orders.addresses.index(connection, {
      orderCode,
      body: requestBody,
    });
  typia.assert(addressPage);

  // 5. Validate that the result is a valid paginated list (at least zero elements is acceptable)
  TestValidator.predicate(
    "address page has valid pagination",
    typeof addressPage.pagination.current === "number" &&
      typeof addressPage.pagination.limit === "number" &&
      typeof addressPage.pagination.records === "number" &&
      typeof addressPage.pagination.pages === "number",
  );
  TestValidator.predicate(
    "address page data is an array",
    Array.isArray(addressPage.data),
  );

  // 6. Validate each returned address has required fields (if any returned)
  for (const summary of addressPage.data) {
    TestValidator.predicate(
      "address id is present",
      typeof summary.id === "string",
    );
    TestValidator.predicate(
      "shopping_order_id is present",
      typeof summary.shopping_order_id === "string",
    );
    TestValidator.predicate(
      "type is present",
      typeof summary.type === "string",
    );
    TestValidator.predicate(
      "recipient_name is present",
      typeof summary.recipient_name === "string",
    );
    TestValidator.predicate(
      "recipient_phone is present",
      typeof summary.recipient_phone === "string",
    );
    TestValidator.predicate(
      "zip_code is present",
      typeof summary.zip_code === "string",
    );
    TestValidator.predicate(
      "base_address is present",
      typeof summary.base_address === "string",
    );
    TestValidator.predicate(
      "city is present",
      typeof summary.city === "string",
    );
    TestValidator.predicate(
      "state_province is present",
      typeof summary.state_province === "string",
    );
    TestValidator.predicate(
      "country is present",
      typeof summary.country === "string",
    );
    TestValidator.predicate(
      "created_at is valid",
      typeof summary.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at is valid",
      typeof summary.updated_at === "string",
    );
  }
}
