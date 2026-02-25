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

export async function test_api_product_variant_inventory_restocking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      logo_image_url: null,
      href: "http://example.com",
      referrer: "http://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product using SDK function
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        base_price: 100,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create product variant with initial stock
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: "TEST-SKU-001",
          option_values: '{"color": "red", "size": "M"}',
          price_override: null,
          quantity: 10,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Perform inventory restocking
  const restockQuantity = 25;
  const inventoryUpdate =
    await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: restockQuantity,
          reason: "restock",
        } satisfies IEcommerceProductVariant.IInventoryChange,
      },
    );
  typia.assert(inventoryUpdate);
  // 5. Validate restocking results
  TestValidator.equals(
    "current stock calculation",
    inventoryUpdate.current_stock,
    variant.quantity + restockQuantity,
  );
  TestValidator.equals(
    "variant ID matches",
    inventoryUpdate.variant_id,
    variant.id,
  );
  TestValidator.equals(
    "operation quantity",
    inventoryUpdate.operation_quantity,
    restockQuantity,
  );
  TestValidator.equals(
    "operation reason",
    inventoryUpdate.operation_reason,
    "restock",
  );
  TestValidator.equals(
    "variant summary ID",
    inventoryUpdate.variant.id,
    variant.id,
  );
  TestValidator.predicate(
    "current stock is positive",
    inventoryUpdate.current_stock > 0,
  );
}
