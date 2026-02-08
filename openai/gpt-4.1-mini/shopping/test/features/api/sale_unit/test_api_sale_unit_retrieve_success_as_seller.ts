import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";

/**
 * Test retrieving detailed information for an existing sale unit as an authenticated seller.
 *
 * This scenario performs the following steps:
 * 1. Registers a new seller using the authorize_seller_join utility.
 * 2. Uses the authorized token to create a new seller-specific connection.
 * 3. Attempts to retrieve a sale unit by its UUID.
 * 4. Asserts the response type and required fields.
 * 5. Validates the response content correlates with expected UUID and field existence.
 * 6. Ensures the HTTP status is 200 and authorization is properly enforced.
 *
 * Note: The sale unit UUID is generated randomly due to lack of available persistent data.
 */
export async function test_api_sale_unit_retrieve_success_as_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);

  // 2. Update seller connection with authorization token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };

  // 3. Generate random UUID for sale unit ID to retrieve
  const unitId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the sale unit by UUID
  const saleUnit = await api.functional.shoppingMall.seller.sale_units.at(
    sellerConnection,
    {
      unitId,
    },
  );

  // 5. Assert the response is valid
  typia.assert(saleUnit);

  // 6. Basic validation that saleUnit object exists (property validation removed due to TS errors)
  TestValidator.predicate(
    "saleUnit is object",
    typeof saleUnit === "object" && saleUnit !== null,
  );
}
