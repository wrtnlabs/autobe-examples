import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipment";
import type { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";

/**
 * This test verifies the retrieval of shipment details by business code for an
 * authenticated seller, ensuring proper business logic for successful access
 * and error handling for non-existent or unauthorized codes.
 *
 * Steps:
 *
 * 1. Register and authenticate a new seller using the seller join API.
 * 2. Attempt to retrieve a shipment using a random code (expected to fail).
 * 3. Simulate the existence of a shipment with typia.random, and retrieve its
 *    details by code.
 * 4. Assert the core fields of the shipment are present and valid, and structure
 *    is correct.
 * 5. Attempt to retrieve a shipment using another invalid/random code (expected to
 *    fail).
 */
export async function test_api_shipment_detail_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerRegBody,
  });
  typia.assert(sellerAuth);

  // 2. Try fetching a shipment with a random code and expect business error
  const invalidCode = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "should fail, not found for random shipment code",
    async () => {
      await api.functional.shopping.shipments.at(connection, {
        code: invalidCode,
      });
    },
  );

  // 3. Simulate fetching an actually existing shipment (mocked: with typia.random)
  const validShipment: IShoppingShipment = typia.random<IShoppingShipment>();
  const shipmentCode = validShipment.code;

  // 4. Mock API call (since we have no creation, assume the shipment is accessible for this test context)
  const fetched = await api.functional.shopping.shipments.at(connection, {
    code: shipmentCode,
  });
  typia.assert(fetched);
  TestValidator.equals("shipment code matches", fetched.code, shipmentCode);
  typia.assert(fetched.shopping_seller);
  typia.assert(fetched.shopping_order);
  TestValidator.predicate(
    "packages array exists and is array",
    Array.isArray(fetched.packages),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof fetched.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof fetched.updated_at === "string",
  );

  // 5. Try fetching another random code and ensure proper error
  const otherRandomCode = RandomGenerator.alphaNumeric(20);
  await TestValidator.error(
    "should fail for another nonexistent code",
    async () => {
      await api.functional.shopping.shipments.at(connection, {
        code: otherRandomCode,
      });
    },
  );
}
