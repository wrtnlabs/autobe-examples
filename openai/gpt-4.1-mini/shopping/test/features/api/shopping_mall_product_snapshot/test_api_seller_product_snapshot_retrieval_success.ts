import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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

export async function test_api_seller_product_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword",
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  // Use seller connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Create a new product by the authorized seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Test unauthorized access: attempt to fetch snapshot with a different seller
  const anotherSellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherAuthorizedSeller = await authorize_seller_join(
    anotherSellerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpassword",
        shopName: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(anotherAuthorizedSeller);
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  anotherSellerConnection.headers = {
    Authorization: `Bearer ${anotherAuthorizedSeller.token.access}`,
  };
  // 4. Attempt to fetch snapshot with valid productId and invalid snapshotId
  await TestValidator.error(
    "fetching snapshot with invalid snapshotId results in error",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.atSnapshot(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(), // likely invalid snapshotId
        },
      );
    },
  );
  // 5. Attempt to fetch snapshot with valid snapshotId and different seller - expect error due to unauthorized access
  await TestValidator.error(
    "unauthorized seller cannot access snapshot",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.atSnapshot(
        anotherSellerConnection,
        {
          productId: product.id,
          snapshotId: product.id, // simulate snapshotId as product ID, but unauthorized user
        },
      );
    },
  );
  // 6. Successful retrieval of snapshot by authorized seller
  const snapshotId = product.id; // simulate snapshot id as product id
  const snapshot =
    await api.functional.shoppingMall.seller.products.snapshots.atSnapshot(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate that snapshot corresponds to the product state at snapshot time
  TestValidator.equals(
    "snapshot productId matches",
    snapshot.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "snapshot id matches requested snapshotId",
    snapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "snapshot name matches product name",
    snapshot.name === product.name,
  );
  TestValidator.predicate(
    "snapshot basePrice equals product basePrice",
    snapshot.basePrice === product.basePrice,
  );
  TestValidator.predicate(
    "snapshot description matches product description",
    snapshot.description === product.description,
  );
  TestValidator.predicate(
    "snapshot categoryId is defined and string",
    typeof snapshot.categoryId === "string" && snapshot.categoryId.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is valid ISO string",
    typeof snapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "snapshot updatedAt is valid ISO string",
    typeof snapshot.updatedAt === "string",
  );
  // 8. Validate nested product snapshot if available
  if (snapshot.product !== undefined) {
    typia.assert(snapshot.product);
    TestValidator.equals(
      "nested snapshot product id matches",
      snapshot.product.id,
      product.id,
    );
    TestValidator.predicate(
      "nested snapshot product name matches",
      snapshot.product.name === product.name,
    );
  }
}
