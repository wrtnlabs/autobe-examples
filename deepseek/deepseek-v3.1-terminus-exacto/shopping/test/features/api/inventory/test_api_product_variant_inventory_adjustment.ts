import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test inventory adjustment workflow where a seller performs negative quantity adjustment for stock correction.
 * This scenario validates that adjustments properly decrease stock without going negative, preserve audit trail with adjustment reasons,
 * and handle edge cases like insufficient stock.
 */
export async function test_api_product_variant_inventory_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant with initial stock
  const initialStock = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >();
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ size: "M", color: "blue" }),
          price_override: null,
          quantity: initialStock,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  TestValidator.equals("variant initial stock", variant.quantity, initialStock);
  // 4. Test negative adjustment (damaged goods)
  const adjustmentNegative = -5 satisfies number as number;
  const reasonDamaged = "damaged_goods";
  const statusAfterNegative =
    await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: adjustmentNegative,
          reason: reasonDamaged,
        } satisfies IEcommerceProductVariant.IInventoryChange,
      },
    );
  typia.assert(statusAfterNegative);
  // Validate negative adjustment results
  const expectedStockAfterNegative = initialStock + adjustmentNegative; // initial + (-5)
  TestValidator.equals(
    "current stock after negative adjustment",
    statusAfterNegative.current_stock,
    expectedStockAfterNegative,
  );
  TestValidator.equals(
    "operation quantity matches adjustment",
    statusAfterNegative.operation_quantity,
    adjustmentNegative,
  );
  TestValidator.equals(
    "operation reason matches",
    statusAfterNegative.operation_reason,
    reasonDamaged,
  );
  TestValidator.equals(
    "variant id matches",
    statusAfterNegative.variant_id,
    variant.id,
  );
  typia.assert(statusAfterNegative.variant);
  TestValidator.equals(
    "variant summary id matches",
    statusAfterNegative.variant.id,
    variant.id,
  );
  // 5. Test business error: insufficient stock
  const insufficientAdjustment = -(
    expectedStockAfterNegative + 10
  ) satisfies number as number;
  await TestValidator.error(
    "should reject adjustment exceeding current stock",
    async () => {
      await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            quantity: insufficientAdjustment,
            reason: "adjustment_loss",
          } satisfies IEcommerceProductVariant.IInventoryChange,
        },
      );
    },
  );
  // 6. Test positive adjustment (restocking)
  const restockQuantity = 20 satisfies number as number;
  const reasonRestock = "restock";
  const statusAfterRestock =
    await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: restockQuantity,
          reason: reasonRestock,
        } satisfies IEcommerceProductVariant.IInventoryChange,
      },
    );
  typia.assert(statusAfterRestock);
  const expectedStockAfterRestock =
    expectedStockAfterNegative + restockQuantity;
  TestValidator.equals(
    "current stock after restock",
    statusAfterRestock.current_stock,
    expectedStockAfterRestock,
  );
  TestValidator.equals(
    "operation quantity matches restock",
    statusAfterRestock.operation_quantity,
    restockQuantity,
  );
  TestValidator.equals(
    "operation reason matches",
    statusAfterRestock.operation_reason,
    reasonRestock,
  );
}
