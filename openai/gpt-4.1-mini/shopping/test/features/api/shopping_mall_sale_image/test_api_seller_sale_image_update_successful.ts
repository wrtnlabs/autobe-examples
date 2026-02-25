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

export async function test_api_seller_sale_image_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and obtain authorized seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      shopName: typia.random<string>(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Simulate existing saleId and imageId (UUIDs)
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update payload with valid imageUrl, positive displayOrder, and altText
  const updateBody: IShoppingMallSaleImage.IUpdate = {
    imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
    displayOrder: 1 + (typia.random<number & tags.Type<"int32">>() % 10), // positive int
    altText: RandomGenerator.paragraph({ sentences: 1 }),
  };
  // 4. Call updateSaleImage endpoint with seller connection
  const updatedImage =
    await api.functional.shoppingMall.seller.sales.images.updateSaleImage(
      sellerConnection,
      {
        saleId,
        imageId,
        body: updateBody,
      },
    );
  // 5. Assert returned updatedImage structure
  typia.assert(updatedImage);
  // 6. Validate fields match update input and required fields are present
  TestValidator.equals(
    "imageUrl matches update",
    updatedImage.imageUrl,
    updateBody.imageUrl,
  );
  TestValidator.equals(
    "displayOrder matches update",
    updatedImage.displayOrder,
    updateBody.displayOrder,
  );
  TestValidator.equals(
    "altText matches update",
    updatedImage.altText ?? null,
    updateBody.altText ?? null,
  );
  TestValidator.predicate(
    "displayOrder is positive",
    updatedImage.displayOrder > 0,
  );
  TestValidator.predicate(
    "imageUrl looks like URL",
    /^https?:\/\/.+/.test(updatedImage.imageUrl),
  );
}
