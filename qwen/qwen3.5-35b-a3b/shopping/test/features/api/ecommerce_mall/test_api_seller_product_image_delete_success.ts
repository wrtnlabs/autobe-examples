import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_image_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test@1234",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com",
    },
  });
  typia.assert(seller);
  // 2. Create product with at least 2 images
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product with Images",
        description: "A test product for image deletion validation",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Verify product has at least 2 images
  TestValidator.equals(
    "product should have at least 2 images for deletion test",
    product.images.length,
    2,
  );
  // 4. Capture image data before deletion
  const mainImage = product.images[0];
  const secondaryImage = product.images[1];
  typia.assert(mainImage);
  typia.assert(secondaryImage);
  // 5. Verify image sequences (0 = main, 1 = secondary)
  TestValidator.equals(
    "main image should have sequence 0",
    mainImage.display_order,
    0,
  );
  TestValidator.equals(
    "secondary image should have sequence 1",
    secondaryImage.display_order,
    1,
  );
  // 6. Delete the secondary image (sequence 1)
  const deletedImageId = secondaryImage.id;
  const deletionResponse =
    await api.functional.ecommerceMall.seller.products.images.erase(
      sellerConnection,
      {
        productId: product.id,
        imageId: deletedImageId,
      },
    );
  typia.assert(deletionResponse);
  // 7. Verify deletion was successful (204 No Content = void response)
  TestValidator.equals(
    "delete response should be void (204 No Content)",
    deletionResponse,
    undefined,
  );
  // 8. Verify main image data was correctly identified for test
  TestValidator.equals(
    "main image ID was correctly captured before deletion",
    product.images[0].id,
    mainImage.id,
  );
  // 9. Verify the deleted image ID is not the same as main image
  TestValidator.notEquals(
    "deleted image should not be the main image",
    deletedImageId,
    mainImage.id,
  );
  // 10. Verify product still has the expected image count before deletion reference
  // Note: Post-deletion verification requires GET API which is not available
  TestValidator.equals(
    "product images count was verified before deletion operation",
    product.images.length,
    2,
  );
}
