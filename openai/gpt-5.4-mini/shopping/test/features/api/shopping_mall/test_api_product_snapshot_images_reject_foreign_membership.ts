import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

export async function test_api_product_snapshot_images_reject_foreign_membership(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
    } satisfies IShoppingMallSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const foreignProductId = typia.random<string & tags.Format<"uuid">>();
  const foreignSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const image1 = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_snapshot_id: snapshotId,
    image_uri: `https://example.com/${RandomGenerator.alphabets(12)}.jpg`,
    display_order: 0,
    created_at: new Date().toISOString(),
  } satisfies IShoppingMallProductSnapshotImage;
  const image2 = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_snapshot_id: snapshotId,
    image_uri: `https://example.com/${RandomGenerator.alphabets(12)}.jpg`,
    display_order: 1,
    created_at: new Date().toISOString(),
  } satisfies IShoppingMallProductSnapshotImage;
  const foreignImage = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_snapshot_id: foreignSnapshotId,
    image_uri: `https://example.com/${RandomGenerator.alphabets(12)}.jpg`,
    display_order: 2,
    created_at: new Date().toISOString(),
  } satisfies IShoppingMallProductSnapshotImage;
  await TestValidator.httpError(
    "reject foreign snapshot image membership",
    [400, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.update(
        sellerConnection,
        {
          productId,
          snapshotId,
          body: {
            images: [image1, foreignImage, image2],
          } satisfies IShoppingMallProductSnapshotImage.IUpdate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reject mismatched product and snapshot context",
    [400, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.update(
        sellerConnection,
        {
          productId: foreignProductId,
          snapshotId,
          body: {
            images: [image1, image2],
          } satisfies IShoppingMallProductSnapshotImage.IUpdate,
        },
      );
    },
  );
}
