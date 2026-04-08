import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { generate_random_ecommerce_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_seller_variants_inventory_create";
import { prepare_random_ecommerce_inventory_record } from "../../../prepare/prepare_random_ecommerce_inventory_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller inventory adjustment with negative quantity for stock subtraction.
 *
 * Validates that a seller can successfully subtract inventory from their product variant through manual adjustment operations. The test authenticates a seller, creates a product with a variant, then creates an inventory record with a negative quantity_change value and a business reason documenting the adjustment.
 *
 * This validates the inventory adjustment workflow used for stock corrections, losses, write-offs, or other manual inventory reductions that are not related to order placements.
 *
 * 1. Seller authenticates via registration endpoint.
 * 2. Seller creates a product with required fields.
 * 3. Seller creates a variant for the product with SKU code and option values.
 * 4. Seller creates an inventory record with negative quantity_change and reason.
 * 5. Validates the inventory record was created successfully with correct values.
 */
export async function test_api_inventory_adjustment_negative_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: RandomGenerator.alphabets(8).toUpperCase(),
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Create inventory record with negative quantity
  const negativeQuantity = -typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const inventoryRecord =
    await generate_random_ecommerce_seller_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: negativeQuantity,
          reason: "loss",
        } satisfies IEcommerceInventoryRecord.ICreate,
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record
  TestValidator.equals(
    "quantity_change is negative",
    inventoryRecord.quantity_change < 0,
    true,
  );
  TestValidator.equals(
    "quantity_change matches input",
    inventoryRecord.quantity_change,
    negativeQuantity,
  );
  TestValidator.equals(
    "reason is provided",
    inventoryRecord.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "variant reference matches",
    inventoryRecord.product_variant.id,
    variant.id,
  );
}