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

export async function test_api_seller_product_images_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // Register a new seller to authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  // Generate a random product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Call reorderImages with empty request body as per DTO definition
  // Despite API specification requiring array of IDs, the DTO is empty
  // We must follow the provided interfaces as the source of truth
  const reorderedImages =
    await api.functional.shoppingMall.seller.products.images.reorderImages(
      sellerConnection,
      {
        productId,
        body: {} satisfies IShoppingMallProductImagesReorderRequest,
      },
    );
  typia.assert(reorderedImages);
  // Since IShoppingMallProductImage is empty, we cannot validate any fields
  // We can only confirm the operation completed successfully
  // Validation is limited to type assertion and absence of errors
}
