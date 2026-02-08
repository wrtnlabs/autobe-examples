import api from "@ORGANIZATION/PROJECT-api";
import type { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory } from "../../../generate/generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";

export async function test_api_seller_inventory_summary_with_inventory_adjustments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create products and variants
  const rawProducts = await Promise.all(
    Array.from({ length: 2 }, async () => {
      const product = await generate_random_shopping_mall_seller_products_create(
        sellerConnection,
        { body: {} },
      );
      typia.assert(product);
      return product;
    }),
  );
  const products = rawProducts as IEntity[];
  const rawVariants = await Promise.all(
    products.flatMap((product) => [
      generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        { params: { productId: (product as IEntity).id }, body: {} },
      ),
      generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        { params: { productId: (product as IEntity).id }, body: {} },
      ),
    ]),
  );
  const variants = rawVariants as IEntity[];
  variants.forEach((v) => typia.assert(v));
  // 3. Inventory adjustments (add then subtract stock) with reasons
  // Add stock
  const addedInventories = await Promise.all(
    variants.map((v) =>
      generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory(
        sellerConnection,
        {
          params: { variantId: (v as IEntity).id },
          body: { quantityDelta: 100, reason: "Initial stock addition" },
        },
      ),
    ),
  );
  addedInventories.forEach((i) => typia.assert(i));
  // Subtract stock
  const subtractedInventories = await Promise.all(
    variants.map((v) =>
      generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory(
        sellerConnection,
        {
          params: { variantId: (v as IEntity).id },
          body: { quantityDelta: -20, reason: "Stock correction" },
        },
      ),
    ),
  );
  subtractedInventories.forEach((i) => typia.assert(i));
  // 4. Retrieve and check inventory summary
  const summary =
    await api.functional.shoppingMall.seller.inventory.summary.summaryInventory(
      sellerConnection,
    );
  typia.assert(summary);
  // Use 'any' type conversion to test properties not existing in the imported type
  const anySummary = summary as any;
  // Calculations
  // total_variants: total of variants
  TestValidator.equals(
    "total variants",
    anySummary.total_variants,
    variants.length,
  );
  // total_products: total of products
  TestValidator.equals(
    "total products",
    anySummary.total_products,
    products.length,
  );
  // total_stock: sum of stock_quantity in all variants
  const expectedTotalStock = variants.length * (100 - 20); // Each variant net stock 80
  TestValidator.equals("total stock", anySummary.total_stock, expectedTotalStock);
  // total_inventory_addition: count of addition records
  TestValidator.predicate(
    "total inventory addition count positive",
    typeof anySummary.total_inventory_addition === "number" &&
      anySummary.total_inventory_addition >= variants.length,
  );
  // total_inventory_subtraction: count of subtraction records
  TestValidator.predicate(
    "total inventory subtraction count positive",
    typeof anySummary.total_inventory_subtraction === "number" &&
      anySummary.total_inventory_subtraction >= variants.length,
  );
  // Optionally, the counts could exactly match (if system only has these adjustments)
  // But the test only ensures counts are >= variants.length (since may have previous data)
}
