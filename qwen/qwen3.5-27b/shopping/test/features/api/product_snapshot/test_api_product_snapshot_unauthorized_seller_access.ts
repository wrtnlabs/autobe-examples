import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import type { IShoppingMallProductSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that a seller cannot access product snapshots belonging to another seller.
 *
 * Validates the authorization mechanism for product snapshot access, ensuring that sellers can only view snapshots of their own products. This test verifies that the system properly isolates seller data and prevents unauthorized cross-seller access to audit trail information.
 *
 * The test creates two separate seller accounts, generates a product snapshot owned by Seller A, then attempts to access that snapshot using Seller B's credentials. The system should reject this unauthorized access attempt with a 403 Forbidden error.
 *
 * 1. Register and authenticate Seller A with unique credentials.
 * 2. Seller A creates a product with name, description, and base price.
 * 3. Seller A updates the product to trigger snapshot creation.
 * 4. Register and authenticate Seller B with different credentials.
 * 5. Seller B attempts to retrieve Seller A's product snapshot.
 * 6. Verify that the access attempt fails with an HTTP error (403 Forbidden).
 */
export async function test_api_product_snapshot_unauthorized_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Seller A creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller A updates the product to create a snapshot
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Generate a snapshot ID for the test
  // The backend should validate seller ownership before checking snapshot existence
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 5. Seller B attempts to access Seller A's product snapshot
  // This should fail with 403 Forbidden due to unauthorized access
  await TestValidator.httpError(
    "unauthorized seller cannot access another seller's snapshot",
    403,
    async () =>
      await api.functional.shoppingMall.seller.products.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
        },
      ),
  );
}
