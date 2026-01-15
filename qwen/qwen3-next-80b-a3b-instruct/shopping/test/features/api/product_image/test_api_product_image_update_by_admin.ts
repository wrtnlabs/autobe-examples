import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttributeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeFilter";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_image_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a product ID
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Generate image IDs to update with
  // According to the API, this PATCH operation expects an array of image IDs
  const imageId: string = typia.random<string & tags.Format<"uuid">>();
  const imageIds: string[] = [imageId];
  // Step 4: Update the product image using the provided API
  // The API endpoint is PATCH /shoppingMall/admin/products/{productId}/images
  // The request body should be a list of image IDs to associate with the product
  // The API returns the updated image summary (not a list of summaries)
  const updatedImage =
    await api.functional.shoppingMall.admin.products.images.patchByProductid(
      adminConnection,
      {
        productId: productId,
        body: {
          tag: imageIds, // Arrays of image IDs to associate, replacing any existing associations
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  // Step 5: Validate that response is the image summary
  typia.assert<IShoppingMallProductImage.ISummary>(updatedImage);
  const image: IShoppingMallProductImage.ISummary = updatedImage;
  // Step 6: Verify that the returned image matches our expectations
  TestValidator.equals("image ID matches", image.id, imageId);
  // Step 7: Verify that the returned image is marked as primary (since it's the only one)
  TestValidator.predicate("image is primary", image.is_primary);
  // Step 8: Verify that the returned image has order=1 (first image)
  TestValidator.equals("image order is 1", image.order, 1);
  // Step 9: Verify the image has all other expected properties
  TestValidator.predicate("image has a URL", image.url.length > 0);
  TestValidator.predicate("image has a name", image.name.length > 0);
  TestValidator.predicate(
    "image has a created_at timestamp",
    image.created_at.length > 0,
  );
  TestValidator.predicate(
    "image has a valid extension",
    image.extension.length > 0,
  );
}
