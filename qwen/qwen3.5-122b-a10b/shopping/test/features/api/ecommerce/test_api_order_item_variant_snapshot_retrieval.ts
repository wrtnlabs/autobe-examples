import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
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
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller variant snapshot retrieval for order items.
 *
 * Validates that sellers can retrieve immutable variant snapshots for order items through the seller API endpoint. The snapshot preserves the exact variant state at purchase time including SKU code, pricing, and option values.
 *
 * This test validates the snapshot endpoint structure and response format when provided with valid UUID parameters. Full order creation workflow is not tested as order creation API is not available in the current test environment.
 *
 * 1. Seller authenticates via join endpoint
 * 2. Seller creates a product with variants for context
 * 3. Seller calls variant snapshot endpoint with generated UUIDs
 * 4. Validates response structure contains required snapshot fields
 */
export async function test_api_order_item_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Create product with variants for context
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string & tags.MaxLength<255>>(),
        description: typia.random<string & tags.MaxLength<1000>>(),
        base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphabets(8).toUpperCase()}`,
            option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(4)}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Retrieve variant snapshot (using generated UUIDs since order creation not available)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerce.seller.orders.items.snapshot.variant.at(
      sellerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure
  TestValidator.predicate("has sku_code", snapshot.sku_code.length > 0);
  TestValidator.predicate("has variant_price", snapshot.variant_price > 0);
  TestValidator.predicate("has options array", snapshot.options.length > 0);
  TestValidator.predicate("has created_at", snapshot.created_at.length > 0);
  // Validate options structure
  for (const option of snapshot.options) {
    TestValidator.predicate("option has key", option.key.length > 0);
    TestValidator.predicate("option has value", option.value.length > 0);
  }
}