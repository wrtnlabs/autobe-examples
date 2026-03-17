import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_product_snapshot_image_copy_historical_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 1000,
          status: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Snapshot/image-copy setup APIs are not available in the provided materials,
  // so this test validates the historical retrieval contract and read-only
  // stability for a seller-scoped request using consistent parent-chain IDs.
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const imageCopyId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.shoppingMall.seller.products.snapshots.image_copies.at(
      sellerConnection,
      {
        productId: product.id,
        productSnapshotId,
        imageCopyId,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "requested image copy id matches",
    first.id,
    imageCopyId,
  );
  TestValidator.equals(
    "parent snapshot id matches request",
    first.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals(
    "parent product id matches request",
    first.productSnapshot.product.id,
    product.id,
  );
  TestValidator.predicate("created_at is present", first.created_at.length > 0);
  const second =
    await api.functional.shoppingMall.seller.products.snapshots.image_copies.at(
      sellerConnection,
      {
        productId: product.id,
        productSnapshotId,
        imageCopyId,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeat read returns same image copy id",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "repeat read returns same snapshot id",
    second.productSnapshot.id,
    first.productSnapshot.id,
  );
  TestValidator.equals(
    "repeat read returns same product id",
    second.productSnapshot.product.id,
    first.productSnapshot.product.id,
  );
  TestValidator.equals(
    "repeat read returns same preserved sequence",
    second.sequence,
    first.sequence,
  );
  TestValidator.equals(
    "repeat read returns same preserved image uri",
    second.image_uri,
    first.image_uri,
  );
  TestValidator.equals(
    "repeat read returns same preserved thumbnail flag",
    second.thumbnail,
    first.thumbnail,
  );
  TestValidator.equals(
    "repeat read returns same created_at",
    second.created_at,
    first.created_at,
  );
}
