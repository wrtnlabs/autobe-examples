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
 * Test cross-seller access control for inventory records.
 *
 * Validates that sellers cannot access inventory records for products they do not own. Two seller accounts are created and authenticated. The first seller creates a product with a variant and an inventory record. The second seller then attempts to access this inventory record, which must be rejected with a 403 Forbidden response.
 *
 * This test ensures the access control mechanism properly validates seller ownership through the product-variant relationship chain before allowing inventory record access.
 *
 * 1. Register and authenticate first seller account (Seller A).
 * 2. Seller A creates a product with basic information.
 * 3. Seller A creates a variant for the product.
 * 4. Seller A creates an inventory record for the variant.
 * 5. Register and authenticate second seller account (Seller B).
 * 6. Seller B attempts to access Seller A's inventory record.
 * 7. Validates the access is rejected with 403 Forbidden error.
 */
export async function test_api_inventory_record_access_control_cross_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller A creates a product
  const productA = await generate_random_ecommerce_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  // 3. Seller A creates a variant
  const variantA =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerAConnection,
      {
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(4)}`,
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: productA.id,
        },
      },
    );
  typia.assert(variantA);
  // 4. Seller A creates an inventory record
  const inventoryRecordA =
    await generate_random_ecommerce_seller_variants_inventory_create(
      sellerAConnection,
      {
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock",
        } satisfies IEcommerceInventoryRecord.ICreate,
        params: {
          variantId: variantA.id,
        },
      },
    );
  typia.assert(inventoryRecordA);
  // 5. Create and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerB);
  // 6. Seller B attempts to access Seller A's inventory record - should fail with 403
  await TestValidator.httpError(
    "cross-seller inventory record access must be forbidden",
    403,
    async () => {
      await api.functional.ecommerce.seller.variants.inventory.at(
        sellerBConnection,
        {
          variantId: variantA.id,
          recordId: inventoryRecordA.id,
        },
      );
    },
  );
}
