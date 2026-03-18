import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function test_api_product_image_update_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  const imageUri = `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const displayOrder = typia.random<number & tags.Type<"int32">>();
  const altText = RandomGenerator.name();
  const updated =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId,
        imageId,
        body: {
          imageUri,
          displayOrder,
          altText,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated image id preserved", updated.id, imageId);
  TestValidator.equals("updated image uri", updated.imageUri, imageUri);
  TestValidator.equals(
    "updated image display order",
    updated.displayOrder,
    displayOrder,
  );
  TestValidator.equals("updated image alt text", updated.altText, altText);
  TestValidator.equals(
    "updated image product preserved",
    updated.product.id,
    productId,
  );
}
