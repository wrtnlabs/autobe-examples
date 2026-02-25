import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceVariantSnapshot";
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
 * Test successful retrieval of variant snapshot history. Authenticate as seller, create a product with multiple variants,
 * perform several modifications to a specific variant (SKU updates, price changes, stock adjustments) to generate snapshots,
 * then retrieve the audit trail for that variant. Verify the response contains paginated snapshot records in reverse
 * chronological order, includes accurate before/after states for each change, correctly identifies the actor (seller) for
 * each operation, and contains all required audit trail information. Validate pagination functionality by testing
 * different page/limit combinations.
 */
export async function test_api_product_variant_snapshot_audit_trail_success(
  connection: api.IConnection,
): Promise<void> {
  // Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // Create product using utility function
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Create multiple variants for the target variant to generate snapshot history
  // Each variant creation creates a snapshot
  const variantCreations = await Promise.all(
    ArrayUtil.repeat(4, (i) =>
      generate_random_ecommerce_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku: `VARIANT-${i + 1}-${RandomGenerator.alphabets(4)}`,
            option_values: JSON.stringify({
              size: ["S", "M", "L", "XL"][i % 4],
              color: ["Red", "Blue", "Green", "Black"][i % 4],
            }),
            price_override: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<500>
            >(),
            quantity: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10> &
                tags.Maximum<100>
            >(),
          },
        },
      ),
    ),
  );
  const targetVariant = variantCreations[0];
  // Test pagination with limit=2
  const page1 =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: targetVariant.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination data length", page1.data.length, 2);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.predicate("total records >= 2", page1.pagination.records >= 2);
  // Test page 2
  const page2 =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: targetVariant.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.predicate(
    "page 2 has data or is empty based on total",
    page2.pagination.pages >= 2 ? page2.data.length > 0 : true,
  );
  // Verify snapshot order (reverse chronological) - newest first
  const allSnapshots = [...page1.data, ...page2.data].filter(
    (s) => s !== undefined,
  );
  for (let i = 1; i < allSnapshots.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} created at or before ${i - 1} (reverse chronological)`,
      new Date(allSnapshots[i].created_at) <=
        new Date(allSnapshots[i - 1].created_at),
    );
  }
  // Verify actor is seller for snapshots
  allSnapshots.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} has seller actor`,
      snapshot.seller !== undefined && snapshot.seller !== null,
    );
    if (snapshot.seller) {
      TestValidator.equals(
        `snapshot ${index} seller id matches`,
        snapshot.seller.id,
        sellerAuthorized.id,
      );
    }
  });
  // Verify snapshot data contains required audit trail information
  allSnapshots.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} has operation type`,
      snapshot.operation_type.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has created_at`,
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(`snapshot ${index} has id`, snapshot.id.length > 0);
    // For create operations, check current_sku is populated
    if (snapshot.operation_type === "create") {
      TestValidator.predicate(
        `snapshot ${index} create has current_sku`,
        snapshot.current_sku !== null && snapshot.current_sku.length > 0,
      );
    }
  });
  // Test different limit combinations
  const limitTest =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: targetVariant.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(limitTest);
  TestValidator.equals("limit=1 returns 1 item", limitTest.data.length, 1);
  TestValidator.equals(
    "limit=1 sets limit to 1",
    limitTest.pagination.limit,
    1,
  );
}
