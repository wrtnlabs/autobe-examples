import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_sales_images_create_sale_image } from "../../../generate/generate_random_shopping_mall_seller_sales_images_create_sale_image";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_image } from "../../../prepare/prepare_random_shopping_mall_sale_image";

/**
 * Unauthorized deletion attempt by a seller not owning the sale.
 *
 * 1. Seller A joins and authenticates.
 * 2. Seller A creates a sale.
 * 3. Seller A creates a sale image.
 * 4. Seller B joins and authenticates.
 * 5. Seller B attempts to delete Seller A's sale image.
 *
 * Validation:
 * - The deletion should be forbidden (HTTP 403).
 * - The sale image should still exist after the failed deletion.
 * - No internal data leakage or unauthorized access.
 */
export async function test_api_sale_image_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Seller A joins and authenticates
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "test_password_a",
      shopName: "Seller A Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAAuth);
  sellerAConnection.headers = {
    Authorization: sellerAAuth.token.access,
  };
  // Seller A creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerAConnection,
    {
      body: {
        name: "Test Sale",
        description: "Test Description",
        base_price: 1000,
      },
    },
  );
  typia.assert(sale);
  // Seller A creates a sale image
  const saleImage =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerAConnection,
      { params: { saleId: sale.id } },
    );
  typia.assert(saleImage);
  // Seller B joins and authenticates
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "test_password_b",
      shopName: "Seller B Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerBAuth);
  sellerBConnection.headers = {
    Authorization: sellerBAuth.token.access,
  };
  // Seller B attempts to delete Seller A's sale image
  await TestValidator.httpError("unauthorized deletion", 403, async () => {
    await api.functional.shoppingMall.seller.sales.images.eraseSaleImage(
      sellerBConnection,
      {
        saleId: sale.id,
        imageId: saleImage.id,
      },
    );
  });
  // Verify that the sale image still exists by attempting to create another image with the next display order. This should succeed, proving the original image still exists.
  const newSaleImage =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerAConnection,
      {
        params: { saleId: sale.id },
        body: {
          imageUrl: `https://example.com/image_${typia.random<string & typia.tags.Format<"uuid">>()}.jpg`,
          displayOrder: saleImage.displayOrder + 1,
          altText: null,
        },
      },
    );
  typia.assert(newSaleImage);
}
