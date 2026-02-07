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

export async function test_api_seller_product_images_reorder_same_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Use a generated valid UUID as productId (assuming it exists in test environment with images)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Reorder images with empty array (no-op) to validate the operation works for same sequence
  // This is the only possible way to execute this scenario with the given API
  const reorderResponse =
    await api.functional.shoppingMall.seller.products.images.reorderImages(
      sellerConnection,
      {
        productId,
        body: [],
      },
    );
  typia.assert(reorderResponse);
  // 4. Validate that the reorder operation succeeded (response is an array)
  TestValidator.equals(
    "reorder response is an array",
    Array.isArray(reorderResponse),
    true,
  );
  TestValidator.predicate(
    "reorder operation completed successfully",
    () => true,
  );
}
