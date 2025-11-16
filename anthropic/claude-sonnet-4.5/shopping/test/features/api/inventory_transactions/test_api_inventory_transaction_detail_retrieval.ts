import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import type { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_inventory_transaction_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: `+82${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000000> & tags.Maximum<9999999999>>()}`,
        business_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        business_description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        store_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: `+82${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000000> & tags.Maximum<9999999999>>()}`,
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin creates a product category
  const categorySlug = RandomGenerator.alphaNumeric(10);
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 7,
        }),
        slug: categorySlug,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
        >(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCode = `SALE-${RandomGenerator.alphaNumeric(12)}`;
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 12,
          sentenceMax: 20,
        }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Create SKU variant for the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<
          number & tags.Minimum<1> & tags.Maximum<10000>
        >(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);

  // Step 6: Create initial inventory stock (this generates a transaction)
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
  >();
  const inventoryStock: IShoppingMallInventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialQuantity,
          low_stock_threshold: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
          >(),
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // Validate inventory stock creation
  TestValidator.equals(
    "inventory stock total quantity matches",
    inventoryStock.total_quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "inventory stock SKU reference is correct",
    inventoryStock.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "available quantity equals total quantity initially",
    inventoryStock.available_quantity,
    initialQuantity,
  );
  TestValidator.predicate(
    "reserved quantity starts at zero",
    inventoryStock.reserved_quantity === 0,
  );
}
