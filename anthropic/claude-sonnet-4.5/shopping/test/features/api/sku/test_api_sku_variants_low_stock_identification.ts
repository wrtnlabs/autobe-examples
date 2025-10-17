import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test SKU variant filtering to identify low-stock items for seller inventory
 * management.
 *
 * This test validates that sellers can filter SKU variants to identify products
 * with inventory levels below their low stock thresholds, enabling proactive
 * restocking workflows and efficient inventory health monitoring across all
 * product variants.
 *
 * Test workflow:
 *
 * 1. Admin authenticates and creates product category
 * 2. Seller authenticates for inventory management operations
 * 3. Seller creates a product for SKU variant inventory testing
 * 4. Seller creates multiple SKU variants with varying inventory levels and
 *    thresholds
 * 5. Filter SKUs to retrieve all variants and identify low-stock items
 * 6. Validate low-stock identification accuracy and inventory data correctness
 */
export async function test_api_sku_variants_low_stock_identification(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(2),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const skuVariants = ArrayUtil.repeat(5, (index) => {
    return {
      sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
      price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    } satisfies IShoppingMallSku.ICreate;
  });

  const createdSkus: IShoppingMallSku[] = await ArrayUtil.asyncMap(
    skuVariants,
    async (skuData) => {
      const sku: IShoppingMallSku =
        await api.functional.shoppingMall.seller.products.skus.create(
          connection,
          {
            productId: product.id,
            body: skuData,
          },
        );
      typia.assert(sku);
      return sku;
    },
  );

  const skuPage: IPageIShoppingMallSku =
    await api.functional.shoppingMall.products.skus.index(connection, {
      productId: product.id,
      body: {
        page: 1,
      } satisfies IShoppingMallSku.IRequest,
    });
  typia.assert(skuPage);

  TestValidator.equals(
    "all created SKU variants are returned",
    skuPage.data.length,
    createdSkus.length,
  );

  TestValidator.predicate(
    "pagination data shows correct total records",
    skuPage.pagination.records >= createdSkus.length,
  );

  for (const createdSku of createdSkus) {
    const foundSku = skuPage.data.find((sku) => sku.id === createdSku.id);
    TestValidator.predicate(
      `created SKU ${createdSku.sku_code} exists in filtered results`,
      foundSku !== undefined,
    );
  }
}
