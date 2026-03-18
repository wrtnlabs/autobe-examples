import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_product_snapshot_history_filtered_paging(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "password123!",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const firstPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "snapshot paging should be stable for repeated requests",
    firstPage,
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    ),
  );
  TestValidator.predicate(
    "snapshot page metadata should be consistent",
    () =>
      firstPage.pagination.current === 1 &&
      firstPage.pagination.limit === 1 &&
      firstPage.pagination.records >= firstPage.data.length &&
      firstPage.pagination.pages >= 0,
  );
  if (firstPage.data.length > 0) {
    const snapshot = firstPage.data[0];
    typia.assert(snapshot);
    const snapshotVersion = typia.assert<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(snapshot.snapshot_version);
    const filteredByVersion =
      await api.functional.shoppingMall.seller.products.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 1,
            fromVersion: snapshotVersion,
            toVersion: snapshotVersion,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );
    typia.assert(filteredByVersion);
    TestValidator.predicate(
      "version-filtered snapshot data should stay within the requested version bounds",
      () =>
        filteredByVersion.data.every(
          (item) => item.snapshot_version === snapshot.snapshot_version,
        ),
    );
    TestValidator.equals(
      "version-filtered requests should be deterministic",
      filteredByVersion,
      await api.functional.shoppingMall.seller.products.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 1,
            fromVersion: snapshotVersion,
            toVersion: snapshotVersion,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      ),
    );
    const filteredByCapturedAt =
      await api.functional.shoppingMall.seller.products.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 1,
            fromCapturedAt: snapshot.captured_at,
            toCapturedAt: snapshot.captured_at,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );
    typia.assert(filteredByCapturedAt);
    TestValidator.predicate(
      "captured-at filtered snapshot data should stay within the requested timestamp bounds",
      () =>
        filteredByCapturedAt.data.every(
          (item) => item.captured_at === snapshot.captured_at,
        ),
    );
    TestValidator.equals(
      "captured-at filtered requests should be deterministic",
      filteredByCapturedAt,
      await api.functional.shoppingMall.seller.products.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 1,
            fromCapturedAt: snapshot.captured_at,
            toCapturedAt: snapshot.captured_at,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      ),
    );
  }
}
