import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { generate_random_shopping_mall_admin_products_images_create } from "../../../generate/generate_random_shopping_mall_admin_products_images_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_image_upload_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random product ID for the images to be uploaded to
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Upload multiple image files using the generation function
  // The generation function creates the file content internally and uploads to the product
  const uploadedImages =
    await generate_random_shopping_mall_admin_products_images_create(
      adminConnection,
      {
        params: {
          productId: productId,
        },
      },
    );
  // Step 4: Validate the response structure and content
  typia.assert(uploadedImages);
  // Verify pagination structure
  TestValidator.equals(
    "pagination present",
    typeof uploadedImages.pagination,
    "object",
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(uploadedImages.data),
    true,
  );
  // Validate each uploaded image
  // We expect at least one image to be uploaded
  TestValidator.predicate(
    "at least one image uploaded",
    uploadedImages.data.length >= 1,
  );
  // Validate that the first image is marked as primary (as per API specification)
  // According to the API documentation: "The first uploaded image becomes the primary image"
  const firstImage = uploadedImages.data[0];
  TestValidator.equals("first image is primary", firstImage.is_primary, true);
  // Validate that all uploaded images have standard properties
  for (const image of uploadedImages.data) {
    TestValidator.equals("image has id", typeof image.id, "string");
    TestValidator.equals("image has url", typeof image.url, "string");
    TestValidator.equals("image has name", typeof image.name, "string");
    TestValidator.equals(
      "image has extension",
      typeof image.extension,
      "string",
    );
    TestValidator.equals("image has order", typeof image.order, "number");
    TestValidator.equals(
      "image has is_primary",
      typeof image.is_primary,
      "boolean",
    );
    TestValidator.equals(
      "image has created_at",
      typeof image.created_at,
      "string",
    );
  }
  // Validate pagination data
  TestValidator.equals(
    "pagination current page is 1",
    uploadedImages.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records matches data length",
    uploadedImages.pagination.records,
    uploadedImages.data.length,
  );
  TestValidator.equals(
    "pagination pages is 1",
    uploadedImages.pagination.pages,
    1,
  );
}
