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
import { generate_random_shopping_mall_seller_sales_images_create_sale_image } from "../../../generate/generate_random_shopping_mall_seller_sales_images_create_sale_image";
import { prepare_random_shopping_mall_sale_image } from "../../../prepare/prepare_random_shopping_mall_sale_image";

export async function test_api_sale_image_upload_duplicate_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuthorized.token.access;
  // 2. Prepare a sale UUID
  //    Since the scenario does not provide how to create sale, generate some UUID to simulate context
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Upload first sale image with displayOrder 1
  const firstImage =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerConnection,
      {
        params: { saleId },
        body: { displayOrder: 1 },
      },
    );
  typia.assert(firstImage);
  // 4. Attempt to upload second sale image with duplicated displayOrder 1
  const secondBody = {
    displayOrder: 1,
    imageUrl: RandomGenerator.alphaNumeric(32) + ".jpg",
  } satisfies IShoppingMallSaleImage.ICreate;
  await TestValidator.error(
    "duplicate displayOrder upload rejection",
    async () => {
      await generate_random_shopping_mall_seller_sales_images_create_sale_image(
        sellerConnection,
        {
          params: { saleId },
          body: secondBody,
        },
      );
    },
  );
}
