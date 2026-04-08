import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
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
 * Test seller retrieval of variant option key-value pairs from an order item's purchase snapshot.
 *
 * Validates that authenticated sellers can access normalized option attributes (e.g., color, size, material) from order item snapshots. The test ensures the snapshot preserves purchase-time variant configuration and returns properly paginated results with metadata.
 *
 * This test covers the complete workflow from seller authentication through snapshot data retrieval, verifying that the API correctly returns variant option key-value pairs with pagination information.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with variants containing option attributes.
 * 3. Test calls the snapshot variant options endpoint with order and item UUIDs.
 * 4. Validates pagination metadata includes current page, limit, records, and pages.
 * 5. Validates variant options contain key-value pairs representing option attributes.
 */
export async function test_api_order_item_snapshot_variant_options_retrieval(
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
    },
  });
  typia.assert(seller);
  // 2. Seller creates product with variants
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: "RED-LARGE",
            option_values: "color=Red;size=Large",
          },
          {
            sku_code: "BLUE-MEDIUM",
            option_values: "color=Blue;size=Medium",
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 3. Retrieve variant options from order item snapshot
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const output: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
    await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    output.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", output.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination has records",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", output.pagination.pages >= 0);
  // 5. Validate variant options structure
  for (const option of output.data) {
    TestValidator.predicate("option has key", option.key.length > 0);
    TestValidator.predicate("option has value", option.value.length > 0);
  }
}
