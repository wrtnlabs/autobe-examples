import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_detail_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random UUIDs for product and variant
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Call the variant detail endpoint
  const response = await api.functional.ecommerceMall.products.variants.at(
    connection,
    {
      productId,
      variantId,
    },
  );
  // 3. Validate complete response structure with typia.assert
  typia.assert(response);
  // 4. Verify variant and product IDs match request
  TestValidator.equals("variant id matches request", response.id, variantId);
  TestValidator.equals(
    "product id matches request",
    response.product_id,
    productId,
  );
  // 5. Verify in-stock variant requirements
  TestValidator.predicate(
    "stock quantity is positive",
    response.stock_quantity > 0,
  );
  TestValidator.equals(
    "availability status is available",
    response.product.availability_status,
    "available",
  );
  TestValidator.predicate(
    "has available variants",
    response.product.has_available_variants === true,
  );
  // 6. Verify variant-specific price override exists
  TestValidator.predicate(
    "price field present",
    response.price !== undefined && response.price !== null,
  );
  // 7. Verify nested product summary has required fields
  TestValidator.predicate(
    "product name exists",
    response.product.name.length > 0,
  );
  TestValidator.predicate(
    "base price is positive",
    response.product.base_price > 0,
  );
  // 8. Verify category reference exists
  TestValidator.predicate(
    "category id exists",
    response.product.category.id !== "",
  );
  // 9. Verify seller reference exists
  TestValidator.predicate(
    "seller id exists",
    response.product.seller.id !== "",
  );
  // 10. Verify variant is active (not soft-deleted)
  TestValidator.equals("variant not soft-deleted", response.deleted_at, null);
  // 11. Verify option values are configured
  TestValidator.predicate(
    "option values string not empty",
    response.option_values.length > 0,
  );
  // 12. Verify SKU code exists
  TestValidator.predicate(
    "SKU code string not empty",
    response.sku_code.length > 0,
  );
}
