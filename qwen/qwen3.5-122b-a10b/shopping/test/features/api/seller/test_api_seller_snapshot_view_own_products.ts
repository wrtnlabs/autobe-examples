import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IJsonObject } from "@ORGANIZATION/PROJECT-api/lib/structures/IJsonObject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller can view audit trail snapshots for their own products.
 *
 * Scenario:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Seller updates the product (triggers snapshot creation)
 * 4. Seller queries the snapshots endpoint
 * 5. Verify snapshots contain correct data with before/after state
 */
export async function test_api_seller_snapshot_view_own_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.basePrice;
  // 3. Update the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.name(4),
          description: RandomGenerator.paragraph({ sentences: 7 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 4. Query snapshots endpoint
  const snapshots = await api.functional.ecommerceMall.seller.snapshots.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshots.pagination.pages >= 0,
  );
  // 6. Verify snapshots exist
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  // 7. Find snapshot for our product
  const productSnapshot = snapshots.data.find(
    (s) => s.current_values.id === product.id,
  );
  TestValidator.predicate(
    "product snapshot found",
    productSnapshot !== undefined,
  );
  if (productSnapshot) {
    // 8. Validate snapshot structure
    typia.assertGuard(productSnapshot);
    // Verify snapshot has required fields
    TestValidator.predicate(
      "snapshot has id",
      productSnapshot.id !== undefined && productSnapshot.id !== null,
    );
    TestValidator.predicate(
      "snapshot has order_item_id",
      productSnapshot.order_item_id !== undefined &&
        productSnapshot.order_item_id !== null,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      productSnapshot.created_at !== undefined &&
        productSnapshot.created_at !== null,
    );
    // 9. Verify current_values contains product data
    const currentValues = productSnapshot.current_values;
    TestValidator.predicate(
      "current_values has id",
      currentValues.id !== undefined && currentValues.id !== null,
    );
    TestValidator.predicate(
      "current_values has name",
      currentValues.name !== undefined && currentValues.name !== null,
    );
    TestValidator.predicate(
      "current_values has description",
      currentValues.description !== undefined &&
        currentValues.description !== null,
    );
    TestValidator.predicate(
      "current_values has basePrice",
      currentValues.basePrice !== undefined && currentValues.basePrice !== null,
    );
    // 10. Verify previous_values shows original state (if available)
    if (productSnapshot.previous_values) {
      const previousValues = typia.assert<IEcommerceMallProduct>(
        productSnapshot.previous_values,
      );
      TestValidator.predicate(
        "previous_values has id",
        previousValues.id !== undefined && previousValues.id !== null,
      );
      TestValidator.predicate(
        "previous_values has name",
        previousValues.name !== undefined && previousValues.name !== null,
      );
    }
    // 11. Verify data consistency
    TestValidator.equals(
      "current name matches updated product",
      currentValues.name,
      updatedProduct.name,
    );
  }
}
