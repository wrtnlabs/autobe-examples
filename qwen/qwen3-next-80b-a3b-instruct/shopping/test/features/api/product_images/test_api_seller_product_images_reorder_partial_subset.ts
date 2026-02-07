import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductImagesReorderRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImagesReorderRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_images_reorder_partial_subset(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // Generate a product ID (assumed to exist with multiple images)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Generate image IDs for partial reorder
  // We'll reorder a subset of two images to demonstrate partial reordering
  const imageId1 = typia.random<string & tags.Format<"uuid">>();
  const imageId2 = typia.random<string & tags.Format<"uuid">>();
  // Reorder a partial subset: provide only two image IDs
  // The system should assign sort_order: 0 to imageId1, 1 to imageId2,
  // and move all other images (not in this list) to start from sort_order = 2 in their original order
  const result =
    await api.functional.shoppingMall.seller.products.images.reorderImages(
      sellerConnection,
      {
        productId,
        body: [
          imageId1,
          imageId2,
        ] satisfies IShoppingMallProductImagesReorderRequest,
      },
    );
  typia.assert(result);
}
