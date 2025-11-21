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

export async function test_api_seller_product_creation_backorder_enabled(
  connection: api.IConnection,
) {
  // 1. Create seller account for backorder testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessName = RandomGenerator.name();
  const registrationNumber = RandomGenerator.alphabets(10).toUpperCase();
  const taxId = RandomGenerator.alphaNumeric(9);
  const businessPhone = RandomGenerator.mobile();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: businessName,
      business_registration_number: registrationNumber,
      tax_id: taxId,
      phone: businessPhone,
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Authenticate seller for dashboard access
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Create product with backorder enabled configuration
  const productSku = RandomGenerator.alphaNumeric(8).toUpperCase();
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSku,
        name: productName,
        description: productDescription,
        price: 99.99,
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: true,
        is_shipping_required: true,
        is_taxable: true,
        category_id: categoryId,
        shopping_mall_seller_id: seller.id,
        href: "https://example-seller.com/products/new",
        referrer: "https://example-seller.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Validate successful backorder-enabled product creation
  TestValidator.equals("product SKU matches input", product.sku, productSku);
  TestValidator.equals(
    "product name matches creation",
    product.name,
    productName,
  );
  TestValidator.equals(
    "product description stored",
    product.description,
    productDescription,
  );
  TestValidator.equals("selling price correct", product.price, 99.99);
  TestValidator.equals(
    "backorder enabled for inventory management",
    product.allow_backorder,
    true,
  );
  TestValidator.equals(
    "quantity tracking active",
    product.track_quantity,
    true,
  );
  TestValidator.equals(
    "shipping configuration correct",
    product.is_shipping_required,
    true,
  );
  TestValidator.equals("taxable item status", product.is_taxable, true);
  TestValidator.equals("product condition", product.condition, "new");
  TestValidator.equals("weight configuration", product.weight, 2.5);
  TestValidator.equals("weight unit specification", product.weight_unit, "kg");
  TestValidator.predicate(
    "seller relationship established",
    product.seller.id === seller.id,
  );
  TestValidator.equals(
    "product ID format valid",
    product.id !== null && product.id.length > 0,
    true,
  );
}
