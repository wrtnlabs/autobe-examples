import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test deletion attempt without seller authentication.
 *
 * This test validates that the system properly rejects unauthorized deletion
 * requests for product units, ensuring that product unit management requires
 * proper seller authentication and authorization. The test will create a seller
 * account first, then test unauthorized deletion scenarios.
 */
export async function test_api_product_unit_deletion_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account to establish the seller context
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(),
    business_registration_number: RandomGenerator.alphabets(12),
    tax_id: RandomGenerator.alphabets(9),
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Log out the seller to remove authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 2: Test deletion without authentication (no authorization header)
  const productCode = RandomGenerator.alphabets(10);
  const unitId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized product unit deletion should fail without authentication",
    async () => {
      await api.functional.shoppingMall.seller.products.units.erase(
        unauthenticatedConnection,
        {
          productCode,
          unitId,
        },
      );
    },
  );

  // Step 3: Test deletion with valid seller but invalid product/unit (should also fail appropriately)
  const invalidProductCode = "INVALID-PROD-123";
  const invalidUnitId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized deletion of non-existent product unit should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.erase(
        unauthenticatedConnection,
        {
          productCode: invalidProductCode,
          unitId: invalidUnitId,
        },
      );
    },
  );
}
