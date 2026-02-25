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

export async function test_api_seller_sale_image_update_displayorder_conflict_resolution(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller joins and obtains authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: seller.token.access };
  // Step 2: Setup initial sale images with distinct displayOrder
  // Since no utility or generation functions provided for sale image creation, simulate that initial images exist with distinct display orders.
  // For the purpose of this test, create two images by calling the updateSaleImage on one first, then update with same saleId but different imageId and displayOrder to simulate conflict.
  // Create mock saleId and two different imageIds
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const imageId1 = typia.random<string & tags.Format<"uuid">>();
  const imageId2 = typia.random<string & tags.Format<"uuid">>();
  // Prepare initial image data for image1 with displayOrder = 1
  const initialImage1: IShoppingMallSaleImage.IUpdate = {
    imageUrl: `https://example.com/image1.jpg`,
    displayOrder: 1,
    altText: "Initial image 1",
  };
  // Prepare initial image data for image2 with displayOrder = 2
  const initialImage2: IShoppingMallSaleImage.IUpdate = {
    imageUrl: `https://example.com/image2.jpg`,
    displayOrder: 2,
    altText: "Initial image 2",
  };
  // Seed initial image1
  const seededImage1 =
    await api.functional.shoppingMall.seller.sales.images.updateSaleImage(
      sellerConnection,
      {
        saleId,
        imageId: imageId1,
        body: initialImage1,
      },
    );
  typia.assert(seededImage1);
  // Seed initial image2
  const seededImage2 =
    await api.functional.shoppingMall.seller.sales.images.updateSaleImage(
      sellerConnection,
      {
        saleId,
        imageId: imageId2,
        body: initialImage2,
      },
    );
  typia.assert(seededImage2);
  // Step 3: Update image2 to have displayOrder that conflicts with image1's displayOrder = 1
  // Provide a new imageUrl and altText to verify update properly
  const updateConflicting: IShoppingMallSaleImage.IUpdate = {
    imageUrl: "https://example.com/image2_updated.jpg",
    displayOrder: 1, // Conflict with image1
    altText: "Updated image 2 with conflicting display order",
  };
  const updatedImage2 =
    await api.functional.shoppingMall.seller.sales.images.updateSaleImage(
      sellerConnection,
      {
        saleId,
        imageId: imageId2,
        body: updateConflicting,
      },
    );
  typia.assert(updatedImage2);
  // Step 4: Validate that the updated image has the requested properties
  TestValidator.equals(
    "updated image2 displayOrder",
    updatedImage2.displayOrder,
    1,
  );
  TestValidator.equals(
    "updated image2 imageUrl",
    updatedImage2.imageUrl,
    updateConflicting.imageUrl,
  );
  TestValidator.equals(
    "updated image2 altText",
    updatedImage2.altText ?? null,
    updateConflicting.altText ?? null,
  );
  // Step 5: Fetch both images to confirm that displayOrder conflict was resolved internally by the system
  // Since only updateSaleImage API exists, call update api with unchanged body to fetch
  // Fetch image1 again (simulate fetch by updating with same initial data)
  const fetchedImage1 =
    await api.functional.shoppingMall.seller.sales.images.updateSaleImage(
      sellerConnection,
      {
        saleId,
        imageId: imageId1,
        body: initialImage1,
      },
    );
  typia.assert(fetchedImage1);
  // fetchedImage1 displayOrder should be unique and not equal to updatedImage2.displayOrder
  TestValidator.predicate(
    "image1 and image2 displayOrders differ",
    fetchedImage1.displayOrder !== updatedImage2.displayOrder,
  );
  // Step 6: Validate that no deletion occurred (deletedAt is null)
  TestValidator.equals("image1 not deleted", fetchedImage1.deletedAt, null);
  TestValidator.equals("image2 not deleted", updatedImage2.deletedAt, null);
}
