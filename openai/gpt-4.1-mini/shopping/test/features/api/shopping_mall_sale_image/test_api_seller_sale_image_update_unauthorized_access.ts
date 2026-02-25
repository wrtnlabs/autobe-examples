import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_image_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests that an unauthorized user (not the owning seller) cannot update a sale image.
  // 1. Seller A joins and authorized
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, { body: {} });
  typia.assert(sellerA);
  // Update sellerAConnection headers
  sellerAConnection.headers ??= {};
  sellerAConnection.headers.Authorization = `Bearer ${sellerA.token.access}`;
  // 2. Seller B joins and authorized
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, { body: {} });
  typia.assert(sellerB);
  // Update sellerBConnection headers
  sellerBConnection.headers ??= {};
  sellerBConnection.headers.Authorization = `Bearer ${sellerB.token.access}`;
  // 3. Prepare random sale and image IDs (no creation APIs available, so rely on presence or simulate existence)
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to update the sale image with Seller B's connection
  const updateBody: IShoppingMallSaleImage.IUpdate = {
    imageUrl: `https://example.com/image_${RandomGenerator.alphaNumeric(8)}.jpg`,
    displayOrder: 1,
    altText: "Unauthorized update attempt",
  };
  // 5. Expect the update attempt to throw http 403 Forbidden error
  await TestValidator.httpError(
    "unauthorized update sale image",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.updateSaleImage(
        sellerBConnection,
        {
          saleId,
          imageId,
          body: updateBody,
        },
      );
    },
  );
}
