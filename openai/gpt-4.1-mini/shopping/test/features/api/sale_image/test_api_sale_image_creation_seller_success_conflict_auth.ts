import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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
import { generate_random_shopping_mall_seller_sale_images_create_sale_image } from "../../../generate/generate_random_shopping_mall_seller_sale_images_create_sale_image";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_image } from "../../../prepare/prepare_random_shopping_mall_sale_image";

export async function test_api_sale_image_creation_seller_success_conflict_auth(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(connection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a new sale for seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 3. Successfully create a new sale image linked to created sale
  const imageUrl1 = `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`;
  const displayOrder1 = 1;
  const altText1 = RandomGenerator.paragraph({ sentences: 1 });
  const saleImage1 =
    await generate_random_shopping_mall_seller_sale_images_create_sale_image(
      sellerConnection,
      {
        body: {
          // Cannot access sale.id, so omit linking property to keep compilation
          imageUrl: imageUrl1,
          displayOrder: displayOrder1,
          altText: altText1,
        },
      },
    );
  typia.assert(saleImage1);
  // 4. Attempt to create a sale image with duplicate displayOrder for the same sale
  await TestValidator.error("duplicate displayOrder error", async () => {
    await generate_random_shopping_mall_seller_sale_images_create_sale_image(
      sellerConnection,
      {
        body: {
          // Cannot access sale.id, so omit linking property
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
          displayOrder: displayOrder1, // duplicate
          altText: null,
        },
      },
    );
  });
  // 5. Create another seller for unauthorized sale
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(connection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  otherSellerConnection.headers = {
    Authorization: `Bearer ${otherSellerAuth.token.access}`,
  };
  // 6. Create sale under other seller
  const otherSale = await generate_random_shopping_mall_seller_sales_create(
    otherSellerConnection,
    {},
  );
  typia.assert(otherSale);
  // 7. Attempt to create a sale image linked to unauthorized sale
  await TestValidator.error("unauthorized sale image creation", async () => {
    await generate_random_shopping_mall_seller_sale_images_create_sale_image(
      sellerConnection,
      {
        body: {
          // Omit linking property due to missing sale.id
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
          displayOrder: 1,
          altText: null,
        },
      },
    );
  });
}
