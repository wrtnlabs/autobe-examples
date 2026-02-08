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

export async function test_api_seller_sale_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a sale image by authenticated seller
  {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    sellerConnection.headers = { Authorization: sellerAuth.token.access };
    const sale = await generate_random_shopping_mall_seller_sales_create(
      sellerConnection,
      {},
    );
    typia.assert(sale);
    // Since sale.id doesn't exist on type, we cast to any to extract 'id'
    const saleId = (sale as any).id as string & tags.Format<"uuid">;
    const saleImage =
      await generate_random_shopping_mall_seller_sale_images_create_sale_image(
        sellerConnection,
        {
          body: {
            shoppingMallSaleId: saleId,
            imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg`,
            displayOrder: 1,
            altText: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(saleImage);
    const saleImageId = (saleImage as any).id as string & tags.Format<"uuid">;
    const retrievedImage =
      await api.functional.shoppingMall.seller.sale_images.at(
        sellerConnection,
        {
          imageId: saleImageId,
        },
      );
    typia.assert(retrievedImage);
    const r = retrievedImage as any;
    const s = saleImage as any;
    TestValidator.equals(
      "retrieved saleImage id matches",
      r.id,
      s.id,
    );
    TestValidator.equals(
      "retrieved saleImage shoppingMallSaleId matches",
      r.shoppingMallSaleId,
      s.shoppingMallSaleId,
    );
    TestValidator.equals(
      "retrieved saleImage imageUrl matches",
      r.imageUrl,
      s.imageUrl,
    );
    TestValidator.equals(
      "retrieved saleImage displayOrder matches",
      r.displayOrder,
      s.displayOrder,
    );
    TestValidator.equals(
      "retrieved saleImage altText matches",
      r.altText,
      s.altText,
    );
    // Dates are strings ISO 8601, check not null or empty
    TestValidator.predicate(
      "retrieved saleImage createdAt is string",
      typeof r.createdAt === "string" &&
        r.createdAt.length > 0,
    );
    TestValidator.predicate(
      "retrieved saleImage updatedAt is string",
      typeof r.updatedAt === "string" &&
        r.updatedAt.length > 0,
    );
  }
  // Scenario 2: Retrieval with non-existent sale image ID
  {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    sellerConnection.headers = { Authorization: sellerAuth.token.access };
    const bogusImageId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "non-existent sale image retrieval returns 404",
      404,
      async () => {
        await api.functional.shoppingMall.seller.sale_images.at(
          sellerConnection,
          { imageId: bogusImageId },
        );
      },
    );
  }
  // Scenario 3: Retrieval without authentication
  {
    const bogusImageId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "unauthorized sale image retrieval returns 401 or 403",
      [401, 403],
      async () => {
        await api.functional.shoppingMall.seller.sale_images.at(connection, {
          imageId: bogusImageId,
        });
      },
    );
  }
}
