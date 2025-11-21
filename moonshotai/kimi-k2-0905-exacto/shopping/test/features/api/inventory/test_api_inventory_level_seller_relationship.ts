import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLevels";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouse";

/**
 * Test that retrieved inventory levels include proper seller relationship data.
 *
 * This test validates that when fetching inventory level information from the
 * shopping mall inventory management system, the seller field contains complete
 * seller summary information as defined in the IShoppingMallSeller.ISummary
 * type.
 *
 * The test will:
 *
 * 1. Generate a random inventory ID using UUID format
 * 2. Call the inventory levels API to retrieve inventory data
 * 3. Validate that the response includes the complete seller object
 * 4. Verify all seller properties are present and properly formatted:
 *
 *    - Id: UUID format
 *    - Email: Valid email address format
 *    - Business_name: String field present
 *    - Phone: String field present
 *    - Business_type: String field present
 *    - Verification_status: String field present
 *    - Is_verified: Boolean field
 *    - Commission_rate: Number field
 *    - Created_at: ISO date-time format
 *    - Updated_at: ISO date-time format
 * 5. Use typia.assert to ensure complete type validation
 * 6. Use TestValidator functions to validate individual field formats and
 *    relationships
 *
 * This ensures the API properly includes complete seller relationship data for
 * inventory level records, which is essential for marketplace operations and
 * seller accountability in the e-commerce platform.
 */
export async function test_api_inventory_level_seller_relationship(
  connection: api.IConnection,
) {
  // Generate a random inventory ID for testing
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve inventory level information
  const inventoryLevel = await api.functional.shoppingMall.inventoryLevels.at(
    connection,
    {
      inventoryId: inventoryId,
    },
  );

  // Validate the complete response structure
  typia.assert(inventoryLevel);

  // Validate seller relationship data completeness and accuracy
  const seller = inventoryLevel.seller;

  // Verify all required seller summary fields are present
  TestValidator.predicate(
    "seller ID has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      seller.id,
    ),
  );

  TestValidator.predicate(
    "seller email has valid format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      seller.email,
    ),
  );

  TestValidator.predicate(
    "seller business name is non-empty string",
    typeof seller.business_name === "string" && seller.business_name.length > 0,
  );

  TestValidator.predicate(
    "seller phone is non-empty string",
    typeof seller.phone === "string" && seller.phone.length > 0,
  );

  TestValidator.predicate(
    "seller business type is non-empty string",
    typeof seller.business_type === "string" && seller.business_type.length > 0,
  );

  TestValidator.predicate(
    "seller verification status is non-empty string",
    typeof seller.verification_status === "string" &&
      seller.verification_status.length > 0,
  );

  TestValidator.predicate(
    "seller is_verified is boolean",
    typeof seller.is_verified === "boolean",
  );

  TestValidator.predicate(
    "seller commission rate is non-negative number",
    typeof seller.commission_rate === "number" && seller.commission_rate >= 0,
  );

  TestValidator.predicate(
    "seller created_at has valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      seller.created_at,
    ),
  );

  TestValidator.predicate(
    "seller updated_at has valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      seller.updated_at,
    ),
  );

  // Verify the inventory level structure is properly linked to seller
  TestValidator.predicate(
    "inventory level has seller reference",
    inventoryLevel.seller !== null && inventoryLevel.seller !== undefined,
  );

  // Verify the seller object contains all expected properties
  const expectedProperties = [
    "id",
    "email",
    "business_name",
    "phone",
    "business_type",
    "verification_status",
    "is_verified",
    "commission_rate",
    "created_at",
    "updated_at",
  ];

  expectedProperties.forEach((property) => {
    TestValidator.predicate(
      `seller object contains ${property} property`,
      property in seller,
    );
  });
}
