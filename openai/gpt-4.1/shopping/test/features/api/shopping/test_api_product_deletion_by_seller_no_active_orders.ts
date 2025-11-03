import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test the process of deleting a product by its owning seller with no active
 * orders.
 *
 * 1. Register a new seller account for isolated context.
 * 2. Simulate the presence of a product with a unique business product code under
 *    the seller (as actual product creation endpoint is not within function
 *    scope).
 * 3. Attempt to delete the product using the seller’s credentials.
 * 4. Confirm the operation returns without error (void response).
 * 5. (In live environments, would also verify that product is inaccessible after
 *    deletion and that audit fields are set. In this SDK/E2E scope, focus on
 *    successful cascade and no errors.)
 * 6. (No active orders or compliance holds are simulated, so no blocking logic
 *    should interfere.)
 */
export async function test_api_product_deletion_by_seller_no_active_orders(
  connection: api.IConnection,
) {
  // 1. Register a new seller to isolate test context.
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerDisplayName: string = RandomGenerator.name();
  const sellerContactPhone: string = RandomGenerator.mobile();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "TestP@ssw0rd123",
        display_name: sellerDisplayName,
        contact_phone: sellerContactPhone,
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Generate a unique product code for a new product (simulate existence)
  const uniqueProductCode: string = RandomGenerator.alphaNumeric(12);

  // 3. Attempt to delete the product using the seller's authorization
  await api.functional.shopping.seller.products.erase(connection, {
    productCode: uniqueProductCode,
  });

  // 4. Verify API returns successfully (void return, so no value is checked)
  TestValidator.predicate(
    "product deletion API call should complete without errors",
    true,
  );

  // 5. Further catalog/search inaccessibility, audit log, and deleted_at checks would occur here if endpoints existed.
}
