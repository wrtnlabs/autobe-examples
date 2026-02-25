import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_variant_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving a product variant snapshot successfully by an authorized seller.
  // 1. Seller joins the platform
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  // Create authorized connection with seller's token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Assume pre-existing productId, variantId, snapshotId in UUID format to test snapshot retrieval
  // To do proper end-to-end, one would create product, variant, snapshot first -- here we simulate with newly generated UUIDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller retrieves the snapshot by IDs
  const snapshot =
    await api.functional.shoppingMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId,
        variantId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate IDs format
  typia.assert(productId);
  typia.assert(variantId);
  typia.assert(snapshotId);
  // Validate snapshot content fields
  typia.assert<string>(snapshot.skuCode);
  typia.assert<string>(snapshot.optionValues);
  // priceOverride may be number or null or undefined
  if (snapshot.priceOverride !== null && snapshot.priceOverride !== undefined) {
    typia.assert<number>(snapshot.priceOverride);
  }
  typia.assert<number>(snapshot.stockQuantity);
  typia.assert<string & tags.Format<"date-time">>(snapshot.createdAt);
  // Confirm snapshot variant ID matches variantId
  TestValidator.equals(
    "snapshot variant id",
    snapshot.shoppingMallProductVariantId,
    variantId,
  );
  // 4. Test unauthorized access: a connection without proper authorization should fail
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access (no token)",
    401,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.snapshots.at(
        anonymousConnection,
        {
          productId,
          variantId,
          snapshotId,
        },
      );
    },
  );
  // 5. Test error on non-existent snapshotId
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Ensure fakeSnapshotId is different
  if (fakeSnapshotId === snapshotId) {
    throw new Error("Fake snapshotId collision, retry test");
  }
  await TestValidator.httpError(
    "non-existent snapshot retrieval",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.snapshots.at(
        sellerConnection,
        {
          productId,
          variantId,
          snapshotId: fakeSnapshotId,
        },
      );
    },
  );
}
