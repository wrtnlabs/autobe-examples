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

export async function test_api_sale_image_delete_success_authorized(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 1: Successful deletion of a sale image by an authorized seller.
   *
   * Steps:
   * 1. Seller joins the platform and obtains an authorized connection.
   * 2. Seller creates a sale.
   * 3. Seller adds an image to the sale.
   * 4. Seller deletes the image.
   * 5. Confirm image deletion by attempting to delete again (expecting 404).
   *
   * Scenario 2: Delete with non-existent saleId or imageId should fail with 404.
   * Scenario 3: Unauthorized seller attempts deletion and should fail with 403.
   */
  // 1. Seller A joins and logs in
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {},
  });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuth.token.access}`,
  };
  // 2. Seller A creates a sale
  const saleA = await generate_random_shopping_mall_seller_sales_create(
    sellerAConnection,
    { body: {} },
  );
  typia.assert(saleA);
  // 3. Seller A adds an image to the sale
  const imageA =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerAConnection,
      { params: { saleId: saleA.id }, body: {} },
    );
  typia.assert(imageA);
  // 4. Seller A deletes the image successfully
  await api.functional.shoppingMall.seller.sales.images.eraseSaleImage(
    sellerAConnection,
    {
      saleId: saleA.id,
      imageId: imageA.id,
    },
  );
  // No explicit status to check since eraseSaleImage returns void
  // 5. Confirm image was actually deleted by attempting to delete again - expect 404
  await TestValidator.httpError(
    "delete non-existing sale image returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.eraseSaleImage(
        sellerAConnection,
        {
          saleId: saleA.id,
          imageId: imageA.id,
        },
      );
    },
  );
  // Scenario 2: Attempt to delete with invalid saleId or imageId
  const invalidSaleId = typia.random<string & tags.Format<"uuid">>();
  const invalidImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete sale image with invalid saleId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.eraseSaleImage(
        sellerAConnection,
        {
          saleId: invalidSaleId,
          imageId: imageA.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "delete sale image with invalid imageId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.eraseSaleImage(
        sellerAConnection,
        {
          saleId: saleA.id,
          imageId: invalidImageId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized seller attempts to delete
  // Seller B joins and logs in
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {},
  });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuth.token.access}`,
  };
  // Seller B attempts to delete Seller A's image (which is already deleted, so recreate image first)
  // Recreate image by Seller A
  const newImageA =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerAConnection,
      { params: { saleId: saleA.id }, body: {} },
    );
  typia.assert(newImageA);
  // Seller B tries to delete Seller A's image - expect 403
  await TestValidator.httpError(
    "unauthorized seller delete returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.eraseSaleImage(
        sellerBConnection,
        {
          saleId: saleA.id,
          imageId: newImageA.id,
        },
      );
    },
  );
}
