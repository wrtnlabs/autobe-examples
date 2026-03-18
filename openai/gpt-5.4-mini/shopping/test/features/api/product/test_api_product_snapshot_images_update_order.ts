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

export async function test_api_product_snapshot_images_update_order(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotImages: IShoppingMallProductSnapshotImage[] = ArrayUtil.repeat(
    3,
    (index) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_snapshot_id: snapshotId,
      image_uri: `https://example.com/product-snapshot-image-${index + 1}.jpg`,
      display_order: index + 1,
      created_at: new Date().toISOString(),
    }),
  );
  const firstReordered = [
    snapshotImages[2],
    snapshotImages[0],
    snapshotImages[1],
  ];
  const updated =
    await api.functional.shoppingMall.seller.products.snapshots.images.update(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: {
          images: firstReordered,
        } satisfies IShoppingMallProductSnapshotImage.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "snapshot image should preserve the first requested image order",
    updated.id,
    firstReordered[0].id,
  );
  TestValidator.equals(
    "snapshot image should preserve the first requested image uri",
    updated.image_uri,
    firstReordered[0].image_uri,
  );
  TestValidator.equals(
    "snapshot image should preserve the first requested display order",
    updated.display_order,
    firstReordered[0].display_order,
  );
  const secondReordered = [
    firstReordered[1],
    firstReordered[2],
    firstReordered[0],
  ];
  const updatedAgain =
    await api.functional.shoppingMall.seller.products.snapshots.images.update(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: {
          images: secondReordered,
        } satisfies IShoppingMallProductSnapshotImage.IUpdate,
      },
    );
  typia.assert(updatedAgain);
  TestValidator.equals(
    "snapshot image update should reflect the reordered first image",
    updatedAgain.id,
    secondReordered[0].id,
  );
  TestValidator.equals(
    "snapshot image update should reflect the reordered first image uri",
    updatedAgain.image_uri,
    secondReordered[0].image_uri,
  );
  TestValidator.equals(
    "snapshot image update should reflect the reordered first display order",
    updatedAgain.display_order,
    secondReordered[0].display_order,
  );
}
