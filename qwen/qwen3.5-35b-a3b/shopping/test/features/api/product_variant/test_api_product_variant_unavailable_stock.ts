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

/**
 * Test retrieving a product variant that has zero stock but is active.
 * Validates that variants are viewable even when out of stock.
 */
export async function test_api_product_variant_unavailable_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  // Create seller (mock data since no utility function)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const seller = {
    id: sellerId,
    email: sellerEmail,
    approvalStatus: "approved" as const,
    rejectionReason: null,
    isSuspended: false,
    isBanned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // 2. Setup: Create category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const category: IEcommerceMallCategory.ISummary = {
    id: categoryId,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    parent: null,
    isLeaf: true,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  // 3. Setup: Create active product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const basePrice = typia.random<number & tags.Minimum<100>>();
  const productSummary: IEcommerceMallProduct.ISummary = {
    id: productId,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    basePrice,
    category,
    seller,
    isActive: true,
  };
  // 4. Create variant with zero stock but active
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const variant = await api.functional.ecommerceMall.products.variants.at(
    { host: connection.host, simulate: true },
    { productId, variantId },
  );
  // Manually create the variant with required properties
  const testVariant: IEcommerceMallProductVariant = {
    id: variantId,
    product: productSummary,
    sku_code: typia.random<string & tags.MaxLength<50>>(),
    option_values: { size: "Large", color: "Blue" },
    price_override: null,
    stock_quantity: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 5. Retrieve variant
  const retrievedVariant =
    await api.functional.ecommerceMall.products.variants.at(connection, {
      productId,
      variantId,
    });
  typia.assert(retrievedVariant);
  // 6. Validate response
  TestValidator.equals(
    "variant stock quantity is zero",
    retrievedVariant.stock_quantity,
    0,
  );
  TestValidator.equals("variant is active", retrievedVariant.is_active, true);
  TestValidator.equals(
    "variant product id matches",
    retrievedVariant.product.id,
    productId,
  );
  TestValidator.equals(
    "variant product is active",
    retrievedVariant.product.isActive,
    true,
  );
  TestValidator.equals(
    "variant product name matches",
    retrievedVariant.product.name,
    productSummary.name,
  );
  TestValidator.equals(
    "variant product base price matches",
    retrievedVariant.product.basePrice,
    productSummary.basePrice,
  );
  TestValidator.equals(
    "variant product category id matches",
    retrievedVariant.product.category.id,
    categoryId,
  );
  TestValidator.equals(
    "variant product seller id matches",
    retrievedVariant.product.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "variant sku_code is present",
    retrievedVariant.sku_code.length,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  );
  TestValidator.equals(
    "variant option_values has keys",
    Object.keys(retrievedVariant.option_values).length,
    2,
  );
  TestValidator.equals(
    "variant price_override is null",
    retrievedVariant.price_override,
    null,
  );
  TestValidator.predicate(
    "variant has valid creation timestamp",
    !isNaN(new Date(retrievedVariant.created_at).getTime()),
  );
  TestValidator.predicate(
    "variant has valid update timestamp",
    !isNaN(new Date(retrievedVariant.updated_at).getTime()),
  );
  TestValidator.equals(
    "variant deleted_at is null",
    retrievedVariant.deleted_at,
    null,
  );
  // 7. Verify customer can view variant despite zero stock
  TestValidator.predicate(
    "out of stock variant is viewable",
    retrievedVariant !== undefined && retrievedVariant !== null,
  );
}
