import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_product_snapshots_create_product_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_product_snapshots_create_product_snapshot";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_snapshot";

export async function test_api_product_snapshot_creation_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Implement the connection isolation pattern: create actors' connections and authorize them
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // Administrator join and login
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  await authorize_administrator_join(connection, { body: adminJoinBody });
  const adminLoginBody: IShoppingMallAdministrator.ILogin = {};
  const adminAuthorized = await authorize_administrator_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(adminAuthorized);
  // Seller join and login
  const sellerJoinBody: IShoppingMallSeller.IJoin =
    typia.random<IShoppingMallSeller.IJoin>();
  await authorize_seller_join(connection, { body: sellerJoinBody });
  const sellerLoginBody: IShoppingMallSeller.ILogin = {};
  const sellerAuthorized = await authorize_seller_login(sellerConnection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerAuthorized);
  // Generate a product for the seller
  const productRaw = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // Cast productRaw to a wider type that includes required properties
  const product = productRaw as IShoppingMallProduct & {
    id: string & tags.Format<"uuid">;
    name: string;
    description: string;
    categoryId: string | null;
    basePrice: number;
    createdAt: string;
    updatedAt: string;
  };
  typia.assert(product);
  // Scenario 1: Create product snapshot for the created product
  const productSnapshot1Raw =
    await generate_random_shopping_mall_administrator_product_snapshots_create_product_snapshot(
      adminConnection,
      {
        body: {
          shoppingMallProductId: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId ?? null,
          basePrice: product.basePrice,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      },
    );
  // Cast productSnapshot1Raw to a wider type including needed properties
  const productSnapshot1 =
    productSnapshot1Raw as IShoppingMallProductSnapshot & {
      shoppingMallProductId: string & tags.Format<"uuid">;
      name: string;
      description: string;
      categoryId: string | null;
      basePrice: number;
      createdAt: string;
      updatedAt: string;
    };
  typia.assert(productSnapshot1);
  TestValidator.equals(
    "Scenario 1: Snapshot product ID matches original product ID",
    productSnapshot1.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "Scenario 1: Snapshot name matches original product name",
    productSnapshot1.name,
    product.name,
  );
  TestValidator.equals(
    "Scenario 1: Snapshot description matches original product description",
    productSnapshot1.description,
    product.description,
  );
  TestValidator.equals(
    "Scenario 1: Snapshot category ID matches original product category ID",
    productSnapshot1.categoryId,
    product.categoryId ?? null,
  );
  TestValidator.equals(
    "Scenario 1: Snapshot base price matches original product base price",
    productSnapshot1.basePrice,
    product.basePrice,
  );
  // Scenario 2: Attempt to create a snapshot for a non-existent product
  const fakeProductId = typia.random<string & tags.Format<"uuid">>();
  const invalidSnapshotBody = {
    shoppingMallProductId: fakeProductId,
    name: "Non-existent product",
    description: "This product does not exist",
    categoryId: null,
    basePrice: 1000.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies IShoppingMallProductSnapshot.ICreate;
  await TestValidator.error(
    "Scenario 2: Creating snapshot with non-existent product throws error",
    async () => {
      await generate_random_shopping_mall_administrator_product_snapshots_create_product_snapshot(
        adminConnection,
        {
          body: invalidSnapshotBody,
        },
      );
    },
  );
  // Scenario 3: Concurrent snapshot creation after successive product updates
  // For this scenario, assuming we have product update API, but none provided.
  // So we simulate multiple snapshot creations reflecting updates by modifying the product object.
  // Simulate multiple updates to product
  const snapshots: (IShoppingMallProductSnapshot & {
    shoppingMallProductId: string & tags.Format<"uuid">;
    name: string;
    description: string;
    categoryId: string | null;
    basePrice: number;
    createdAt: string;
    updatedAt: string;
  })[] = [];
  for (let i = 0; i < 3; i++) {
    // Update product fields (simulate new name and description changed)
    const updatedProduct = {
      ...product,
      name: `${product.name} v${i + 1}`,
      description: `${product.description} updated version ${i + 1}`,
      updatedAt: new Date(Date.now() + (i + 1) * 1000).toISOString(),
    } as IShoppingMallProduct & {
      id: string & tags.Format<"uuid">;
      name: string;
      description: string;
      categoryId: string | null;
      basePrice: number;
      createdAt: string;
      updatedAt: string;
    };
    // Create snapshot reflecting this update
    const snapshotRaw =
      await generate_random_shopping_mall_administrator_product_snapshots_create_product_snapshot(
        adminConnection,
        {
          body: {
            shoppingMallProductId: updatedProduct.id,
            name: updatedProduct.name,
            description: updatedProduct.description,
            categoryId: updatedProduct.categoryId ?? null,
            basePrice: updatedProduct.basePrice,
            createdAt: updatedProduct.createdAt,
            updatedAt: updatedProduct.updatedAt,
          },
        },
      );
    const snapshot = snapshotRaw as IShoppingMallProductSnapshot & {
      shoppingMallProductId: string & tags.Format<"uuid">;
      name: string;
      description: string;
      categoryId: string | null;
      basePrice: number;
      createdAt: string;
      updatedAt: string;
    };
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }
  // Verify each snapshot is distinct and matches the expected version
  for (let i = 0; i < snapshots.length; i++) {
    const expectedName = `${product.name} v${i + 1}`;
    const expectedDescription = `${product.description} updated version ${i + 1}`;
    TestValidator.equals(
      `Scenario 3: Snapshot ${i + 1} name is correct`,
      snapshots[i].name,
      expectedName,
    );
    TestValidator.equals(
      `Scenario 3: Snapshot ${i + 1} description is correct`,
      snapshots[i].description,
      expectedDescription,
    );
  }
}
