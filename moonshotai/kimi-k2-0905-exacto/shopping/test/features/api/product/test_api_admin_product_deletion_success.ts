import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful product deletion scenario where an admin creates a product
 * through seller authentication, then deletes it. Validates the complete
 * product lifecycle from creation to permanent removal, ensuring proper
 * authorization checks and data cleanup. This covers the happy path of product
 * management workflow where products are successfully listed and later removed
 * from the marketplace catalog.
 */
export async function test_api_admin_product_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Create unauthenticated connection for seller
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Seller Registration and Authentication
  const sellerEmail = RandomGenerator.name() + "seller@example.com";
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(unauthConn, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name() + " Store",
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 3: Product Creation by Seller
  const productSKU = "PROD-" + RandomGenerator.alphaNumeric(8);
  const productName = RandomGenerator.name() + " Product";
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSKU,
        name: productName,
        description: productDescription,
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: null,
        cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: categoryId,
        shopping_mall_seller_id: seller.id,
        featured_image: null,
        seo_title: RandomGenerator.name(),
        seo_description: RandomGenerator.paragraph(),
        tags: RandomGenerator.name(),
        variants: [],
        images: [],
        href: "https://seller-dashboard.example.com/products/new",
        referrer: "https://seller-dashboard.example.com/products",
        ip: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 4: Create new unauthenticated connection for admin
  const unauthAdminConn: api.IConnection = { ...connection, headers: {} };

  // Step 5: Admin Registration and Authentication
  const adminEmail = RandomGenerator.name() + "admin@example.com";
  const admin = await api.functional.auth.admin.join(unauthAdminConn, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(),
      lastname: RandomGenerator.name(),
      adminlevel: "support_admin",
      department: "Product Management",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 6: Product Deletion by Admin
  const deletedProduct = await api.functional.shoppingMall.admin.products.erase(
    connection,
    {
      productCode: product.sku,
    },
  );
  typia.assert(deletedProduct);

  // Step 7: Validation
  TestValidator.equals(
    "deleted product matches original product",
    deletedProduct.id,
    product.id,
  );
  TestValidator.equals(
    "deleted product SKU matches original SKU",
    deletedProduct.sku,
    product.sku,
  );
  TestValidator.equals(
    "deleted product name matches original name",
    deletedProduct.name,
    product.name,
  );
}
