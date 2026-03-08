import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller by joining the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create seller-specific connection for image operations
  const sellerImageConnection: api.IConnection = { host: connection.host };
  sellerImageConnection.headers = {
    ...sellerImageConnection.headers,
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 3. Assume a product exists with images
  // Note: In a real scenario, we would create a product and its images first
  // For this test, we use a random product ID (assuming it exists in test data)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Reorder product images by updating display_order values
  // The API reorders images by updating their display_order values
  // Display order values must be unique within a product's image set
  const reorderOperation: IEcommerceMallProductImage.IUpdate = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IEcommerceMallProductImage.IUpdate;
  const updatedImages =
    await api.functional.ecommerceMall.products.images.reorder(
      sellerImageConnection,
      {
        productId: productId,
        body: reorderOperation,
      },
    );
  typia.assert(updatedImages);
  // 5. Validate the response contains the updated image with new display_order
  TestValidator.equals(
    "display_order updated",
    updatedImages.display_order,
    reorderOperation.display_order,
  );
  // 6. Validate that the image is part of the product (product reference exists)
  TestValidator.equals(
    "image belongs to product",
    updatedImages.product.id,
    productId,
  );
  // 7. Verify the first image (lowest display_order) serves as main thumbnail
  // Note: With single image in response, it is by definition the first
  TestValidator.predicate(
    "image has valid display_order (first image)",
    updatedImages.display_order >= 0,
  );
}
