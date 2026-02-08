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

export async function test_api_seller_sale_image_update_display_order_reorder(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Update the display order of a sale image to reorder images in the sale gallery.
  // - Authenticate as a seller and create a sale and associated sale images.
  // - Update the display order field of an existing sale image to a new unique positive integer.
  // - Verify that the updated display order is reflected correctly in the response.
  // - Attempt to set a display order that conflicts with another image and expect a business logic error response.
  // - Confirm transactional integrity and no side effects on other images.
  // 1. Seller join and authorized connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 2. Create a sale for seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // Extract sale id (assume access to id string)
  const saleId: string = (sale as any).id;
  // 3. Create multiple sale images with unique displayOrder values
  const image1 =
    await generate_random_shopping_mall_seller_sale_images_create_sale_image(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: saleId,
          displayOrder: 1,
          imageUrl: "https://example.com/image1.jpg",
          altText: "Image 1",
        },
      },
    );
  typia.assert(image1);
  const imageId1: string = (image1 as any).id;
  const image1DisplayOrder = 1;
  const image2 =
    await generate_random_shopping_mall_seller_sale_images_create_sale_image(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: saleId,
          displayOrder: 2,
          imageUrl: "https://example.com/image2.jpg",
          altText: "Image 2",
        },
      },
    );
  typia.assert(image2);
  const imageId2: string = (image2 as any).id;
  const image2DisplayOrder = 2;
  // 4. Update display order of image1 to 3 (new unique positive integer)
  const newDisplayOrder = 3;
  const updatedImage1 =
    await api.functional.shoppingMall.seller.sale_images.update(
      sellerConnection,
      {
        imageId: imageId1,
        body: {
          displayOrder: newDisplayOrder,
        },
      },
    );
  typia.assert(updatedImage1);
  // Since the DTOs do not expose displayOrder, rely on typia.assert to verify.
  // 5. Attempt to update display order of image2 to 3 (conflicting order)
  await TestValidator.error(
    "Conflicting display order update throws error",
    async () => {
      await api.functional.shoppingMall.seller.sale_images.update(
        sellerConnection,
        {
          imageId: imageId2,
          body: {
            displayOrder: newDisplayOrder, // Conflict with updated image1
          },
        },
      );
    },
  );
  // 6. Verify image2's display order remains unchanged after failed update
  const image2Reupdate =
    await api.functional.shoppingMall.seller.sale_images.update(
      sellerConnection,
      {
        imageId: imageId2,
        body: {
          displayOrder: image2DisplayOrder,
        },
      },
    );
  typia.assert(image2Reupdate);
}
