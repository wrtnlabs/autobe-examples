import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product snapshot access control based on seller ownership.
 *
 * This test verifies that sellers can only view snapshots of products they own.
 * The test flow:
 * 1. Register Seller A and Seller B as separate seller accounts
 * 2. Seller A creates a product
 * 3. Seller A successfully views their own product's snapshots
 * 4. Seller B attempts to view Seller A's product snapshots (should fail with 403)
 * 5. Verify the error is 403 Forbidden (authorization failure)
 * 6. Seller B creates their own product
 * 7. Seller B successfully views their own product's snapshots
 */
export async function test_api_product_snapshot_access_control_seller_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerA);
  // 2. Register Seller B (unauthorized user)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerB);
  // 3. Seller A creates a product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 4. Seller A views their own product's snapshots (should succeed)
  const sellerASnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerAConnection,
      {
        productId: productA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sellerASnapshots);
  TestValidator.predicate("Seller A can view own product snapshots", () =>
    Array.isArray(sellerASnapshots.data),
  );
  // 5. Seller B attempts to view Seller A's product snapshots (should fail with 403)
  let httpError: api.HttpError | null = null;
  try {
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerBConnection,
      {
        productId: productA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
    throw new Error("Expected 403 error but request succeeded");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      httpError = error;
    } else {
      throw error;
    }
  }
  // 6. Verify the error is 403 Forbidden (authorization failure, not not found)
  TestValidator.predicate("HTTP error was thrown", () => httpError !== null);
  TestValidator.equals(
    "Error status should be 403 Forbidden",
    httpError!.status,
    403,
  );
  // 7. Seller B creates their own product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 8. Seller B views their own product's snapshots (should succeed)
  const sellerBSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerBConnection,
      {
        productId: productB.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sellerBSnapshots);
  TestValidator.predicate("Seller B can view own product snapshots", () =>
    Array.isArray(sellerBSnapshots.data),
  );
  // 9. Verify snapshot data structure and ownership
  if (sellerASnapshots.data.length > 0) {
    const snapshot = sellerASnapshots.data[0]!;
    TestValidator.equals(
      "Snapshot seller matches product owner",
      snapshot.seller.id,
      sellerA.id,
    );
  }
  if (sellerBSnapshots.data.length > 0) {
    const snapshot = sellerBSnapshots.data[0]!;
    TestValidator.equals(
      "Seller B snapshot seller matches Seller B",
      snapshot.seller.id,
      sellerB.id,
    );
  }
}
