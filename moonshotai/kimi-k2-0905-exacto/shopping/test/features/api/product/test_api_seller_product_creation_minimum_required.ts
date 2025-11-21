import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product creation with only required fields excluding optional
 * attributes. Validates successful product creation with minimal data including
 * SKU, name, description, price, condition, weight, basic inventory settings,
 * and category assignment. Verifies system handles null optional fields
 * appropriately while maintaining marketplace listing standards.
 *
 * 1. Create a new seller account for testing minimal product creation
 * 2. Authenticate the seller to get proper permissions
 * 3. Create a complete minimal product listing with only required fields
 * 4. Verify the product was created successfully with correct minimal structure
 * 5. Validate that optional fields are appropriately null/undefined
 */
export async function test_api_seller_product_creation_minimum_required(
  connection: api.IConnection,
) {
  // Create a new seller account for testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerImpl: IShoppingMallSeller.IJoin = {
    email: sellerEmail,
    business_name: RandomGenerator.name(2),
    business_registration_number: `REG-${RandomGenerator.alphaNumeric(8)}`,
    tax_id: `TAX-${RandomGenerator.alphaNumeric(10)}`,
    phone: RandomGenerator.mobile(),
    business_type: "Corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerImpl,
  });
  typia.assert(seller);

  // Authenticate the seller for API access
  const auth = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(auth);

  // Create minimal product with only required fields
  const productCreate: IShoppingMallProduct.ICreate = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<100>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://example.com/create-product",
    referrer: "https://example.com/seller-dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // Verify essential product properties
  TestValidator.equals("product sku matches", product.sku, productCreate.sku);
  TestValidator.equals(
    "product name matches",
    product.name,
    productCreate.name,
  );
  TestValidator.equals(
    "product price matches",
    product.price,
    productCreate.price,
  );
  TestValidator.equals(
    "product condition matches",
    product.condition,
    productCreate.condition,
  );
  TestValidator.equals(
    "product seller ID matches",
    product.seller.id,
    productCreate.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "product category ID matches",
    product.category.id,
    productCreate.category_id,
  );

  // Verify minimal structure - all required properties are present
  TestValidator.predicate("product has ID", !!product.id);
  TestValidator.predicate("product has seller summary", !!product.seller);
  TestValidator.predicate("product has category summary", !!product.category);
  TestValidator.predicate(
    "product has variants array",
    Array.isArray(product.variants),
  );
  TestValidator.predicate(
    "product has images array",
    Array.isArray(product.images),
  );
  TestValidator.predicate("product has reviews statistics", !!product.reviews);
  TestValidator.predicate(
    "product has inventory status",
    !!product.inventory_status,
  );
  TestValidator.predicate("product has created_at", !!product.created_at);
  TestValidator.predicate("product has updated_at", !!product.updated_at);

  // Verify optional fields are null/undefined when not provided
  TestValidator.equals(
    "compare_at_price is empty",
    product.compare_at_price,
    null,
  );
  TestValidator.equals("cost is empty", product.cost, null);
  TestValidator.equals("barcode is empty", product.barcode, null);
  TestValidator.equals("seo_title is empty", product.seo_title, null);
  TestValidator.equals(
    "seo_description is empty",
    product.seo_description,
    null,
  );
  TestValidator.equals("tags is empty", product.tags, null);
  TestValidator.equals("featured_image is empty", product.featured_image, null);
  TestValidator.equals("published_at is empty", product.published_at, null);
  TestValidator.equals("deleted_at is empty", product.deleted_at, null);
}
