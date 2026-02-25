import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceInventoryRecord";
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

export async function test_api_product_variant_inventory_history_after_restocking(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as seller
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      shop_name: "Test Shop",
      shop_description: "A test shop for inventory testing",
      logo_image_url: null,
      href: "https://test-shop.com",
      referrer: "https://referrer.com",
      ip: null,
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Create a product
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Inventory Tracking",
        description: "A product used to test inventory history functionality",
        base_price: typia.random<number & tags.Minimum<100>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create a product variant
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: "INV-TEST-001",
          option_values: JSON.stringify({ size: "Large", color: "Blue" }),
          price_override: null,
          quantity: 0,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 4: Perform multiple restocking operations with delays to ensure different timestamps
  const restockingOperations = [
    { quantity: 50, reason: "initial_stock" },
    { quantity: 25, reason: "supplier_delivery" },
    { quantity: 10, reason: "manual_adjustment" },
  ];
  for (const operation of restockingOperations) {
    // Wait a short moment to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Create variant-specific connection for inventory operations
    const variantConnection: api.IConnection = { host: connection.host };
    // Use authorized connection for inventory operations
    await authorize_seller_join(variantConnection, {
      body: {
        email: seller.email,
        password: "test_password_123",
        shop_name: seller.shop_name,
        shop_description: seller.shop_description,
        logo_image_url: seller.logo_image_url,
        href: "https://test-shop.com",
        referrer: "https://referrer.com",
        ip: null,
      } satisfies IEcommerceSeller.IJoin,
    });
    // Perform restocking via variant update (since direct inventory add endpoint isn't available)
    const updatedVariant =
      await api.functional.ecommerce.seller.products.variants.create(
        variantConnection,
        {
          productId: product.id,
          body: {
            sku: variant.sku + "-restock",
            option_values: variant.option_values,
            price_override: variant.price_override,
            quantity: variant.quantity + operation.quantity,
          } satisfies IEcommerceProductVariant.ICreate,
        },
      );
    typia.assert(updatedVariant);
  }
  // Step 5: Retrieve inventory history
  const inventoryHistory =
    await api.functional.ecommerce.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(inventoryHistory);
  // Step 6: Validate inventory history
  TestValidator.equals(
    "history should contain records",
    inventoryHistory.data.length > 0,
    true,
  );
  // Check chronological order (newest first)
  if (inventoryHistory.data.length > 1) {
    for (let i = 0; i < inventoryHistory.data.length - 1; i++) {
      const currentRecord = inventoryHistory.data[i];
      const nextRecord = inventoryHistory.data[i + 1];
      const currentTime = new Date(currentRecord.created_at).getTime();
      const nextTime = new Date(nextRecord.created_at).getTime();
      TestValidator.predicate(
        "records should be chronological (newest first)",
        currentTime >= nextTime,
      );
    }
  }
  // Validate record structure
  inventoryHistory.data.forEach((record, index) => {
    typia.assert(record);
    // Check that record contains variant information
    TestValidator.predicate(
      "record should have variant",
      record.variant !== undefined,
    );
    TestValidator.equals(
      "variant ID should match",
      record.variant.id,
      variant.id,
    );
    // Check that record contains seller information
    TestValidator.predicate(
      "record should have seller",
      record.seller !== undefined,
    );
    TestValidator.equals("seller ID should match", record.seller.id, seller.id);
    // Check that quantity is positive for restocking operations
    TestValidator.predicate(
      "restocking should have positive quantity",
      record.quantity > 0,
    );
    // Check that reason is present
    TestValidator.predicate(
      "record should have reason",
      record.reason.length > 0,
    );
    // Check timestamps
    TestValidator.predicate(
      "should have creation timestamp",
      record.created_at.length > 0,
    );
    TestValidator.predicate(
      "should have update timestamp",
      record.updated_at.length > 0,
    );
  });
  // Validate pagination structure
  TestValidator.predicate(
    "should have pagination info",
    inventoryHistory.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should be 1",
    inventoryHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count should be positive",
    inventoryHistory.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count should be positive",
    inventoryHistory.pagination.pages > 0,
  );
}
