import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_detail_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const sellerOwnerConnection: api.IConnection = { host: connection.host };
  const sellerOwner = await authorize_seller_join(sellerOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerOwner);
  const createdProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerOwnerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 1000,
          status: RandomGenerator.pick(["ACTIVE", "DRAFT", "PENDING"] as const),
          shopping_mall_category_id: null,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(createdProduct);
  const updatedProduct =
    await api.functional.shoppingMall.seller.seller_products.update(
      sellerOwnerConnection,
      {
        productId: createdProduct.id,
        body: {
          name: `${createdProduct.name}-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: createdProduct.base_price + 1,
          status: createdProduct.status,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "updated product id unchanged",
    updatedProduct.id,
    createdProduct.id,
  );
  const sellerOtherConnection: api.IConnection = { host: connection.host };
  const sellerOther = await authorize_seller_join(sellerOtherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerOther);
  const snapshotIdCandidate = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "other seller is denied on foreign product snapshot detail endpoint",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.at(
        sellerOtherConnection,
        {
          productId: createdProduct.id,
          productSnapshotId: snapshotIdCandidate,
        },
      );
    },
  );
}
