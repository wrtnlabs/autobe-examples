import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sale_images_update_logic_authorization_and_order_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerPass123!",
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Create a sale listing for the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 3. Scenario 1: Successfully update sale images by authorized seller
  {
    const imagesToUpdate: IShoppingMallSaleImage.IUpdate[] = [
      {
        imageUrl: `https://example.com/image1-${RandomGenerator.alphaNumeric(8)}.jpg`,
        displayOrder: 1,
        altText: RandomGenerator.name(2),
      },
      {
        imageUrl: `https://example.com/image2-${RandomGenerator.alphaNumeric(8)}.jpg`,
        displayOrder: 2,
        altText: null,
      },
      {
        imageUrl: `https://example.com/image3-${RandomGenerator.alphaNumeric(8)}.jpg`,
        displayOrder: 3,
        altText: null,
      },
    ];
    const response =
      await api.functional.shoppingMall.seller.sales.images.updateImages(
        sellerConnection,
        {
          saleId: sale.id,
          body: imagesToUpdate as unknown as IShoppingMallSaleImage.IUpdate,
        },
      );
    typia.assert(response);
    const sortedImages = [...response.data].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    TestValidator.equals(
      "scenario 1: images ordered by displayOrder",
      response.data,
      sortedImages,
    );
    for (const imgUpdate of imagesToUpdate) {
      const matched = response.data.find(
        (img) =>
          img.imageUrl === imgUpdate.imageUrl &&
          img.displayOrder === imgUpdate.displayOrder,
      );
      TestValidator.predicate(
        "scenario 1: image updated and returned",
        matched !== undefined &&
          matched.altText === (imgUpdate.altText ?? null),
      );
    }
    const allUpdatedUrls = imagesToUpdate.map((img) => img.imageUrl);
    const notInUpdated = response.data.filter(
      (img) => !allUpdatedUrls.includes(img.imageUrl),
    );
    TestValidator.equals(
      "scenario 1: no extra images remain",
      notInUpdated.length,
      0,
    );
  }
  // 4. Scenario 2: Authorization failure when unauthorized user attempts update
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    const unauthorizedAuthorized = await authorize_seller_join(
      unauthorizedConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "unauthPass456$",
          shopName: RandomGenerator.name(1),
        },
      },
    );
    typia.assert(unauthorizedAuthorized);
    unauthorizedConnection.headers = {
      Authorization: `Bearer ${unauthorizedAuthorized.token.access}`,
    };
    await TestValidator.httpError(
      "scenario 2: unauthorized update should be forbidden",
      403,
      async () => {
        const hackImages: IShoppingMallSaleImage.IUpdate[] = [
          {
            imageUrl: `https://example.com/hackimage-${RandomGenerator.alphaNumeric(8)}.png`,
            displayOrder: 1,
            altText: "Hacked Image",
          },
        ];
        await api.functional.shoppingMall.seller.sales.images.updateImages(
          unauthorizedConnection,
          {
            saleId: sale.id,
            body: hackImages as unknown as IShoppingMallSaleImage.IUpdate,
          },
        );
      },
    );
  }
  // 5. Scenario 3: Conflict error on duplicate display order values
  {
    const dupDisplayOrderImages: IShoppingMallSaleImage.IUpdate[] = [
      {
        imageUrl: `https://example.com/dupimage1-${RandomGenerator.alphaNumeric(8)}.jpg`,
        displayOrder: 1,
        altText: "Duplicate 1",
      },
      {
        imageUrl: `https://example.com/dupimage2-${RandomGenerator.alphaNumeric(8)}.jpg`,
        displayOrder: 1,
        altText: "Duplicate 2",
      },
    ];
    await TestValidator.httpError(
      "scenario 3: duplicate displayOrder conflict",
      409,
      async () => {
        await api.functional.shoppingMall.seller.sales.images.updateImages(
          sellerConnection,
          {
            saleId: sale.id,
            body: dupDisplayOrderImages as unknown as IShoppingMallSaleImage.IUpdate,
          },
        );
      },
    );
  }
}
