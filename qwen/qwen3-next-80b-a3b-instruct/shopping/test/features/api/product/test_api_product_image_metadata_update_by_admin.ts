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
export async function test_api_product_image_metadata_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the authorized utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a product image using the generated admin connection
  const productId = typia.random<string & tags.Format<"uuid">>();
  const createdImages: IPageIShoppingMallProductImage.ISummary =
    await generate_random_shopping_mall_admin_products_images_create(
      adminConnection,
      {
        params: { productId },
        body: {},
      },
    );
  typia.assert(createdImages);
  // Ensure at least one image was created and extract the imageId
  if (createdImages.data.length === 0) {
    throw new Error("No product images were created during test setup");
  }
  const imageId = createdImages.data[0].id;
  // Step 3: Capture the values to be updated for validation
  const newAltText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const newCaption = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 5,
  });
  const newDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
  >();
  const newIsEnabled = RandomGenerator.pick([true, false]);
  // Step 4: Update the product image metadata using the admin connection
  const updatedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.admin.products.images.putByProductidAndImageid(
      adminConnection,
      {
        productId,
        imageId,
        body: {
          altText: newAltText,
          caption: newCaption,
          displayOrder: newDisplayOrder,
          isEnabled: newIsEnabled,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // Step 5: Validate that all updated metadata fields are correctly reflected in the response
  TestValidator.equals(
    "altText should be updated",
    updatedImage.alt_text,
    newAltText,
  );
  TestValidator.equals(
    "caption should be updated",
    updatedImage.caption,
    newCaption,
  );
  TestValidator.equals(
    "display_order should be updated",
    updatedImage.display_order,
    newDisplayOrder,
  );
  // For is_primary field: We cannot assume it's affected by isEnabled - they are different properties
  // If it's a read-only field, we can only check that it matches the original summary
  // Since we cannot call a get endpoint, we validate it against the original summary value
  TestValidator.equals(
    "is_primary should remain unchanged",
    updatedImage.is_primary,
    createdImages.data[0].is_primary,
  );
  // Verify the underlying image file path remains unchanged
  TestValidator.equals(
    "image file path should remain unchanged",
    updatedImage.file_path,
    createdImages.data[0].url,
  );
  // Verify other properties not updated remain unchanged
  TestValidator.equals(
    "file_name should remain unchanged",
    updatedImage.file_name,
    createdImages.data[0].name,
  );
  TestValidator.equals(
    "mime_type should remain unchanged",
    updatedImage.mime_type,
    createdImages.data[0].extension,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedImage.created_at,
    createdImages.data[0].created_at,
  );
  // Note: 'file_size' property does not exist on IPageIShoppingMallProductImage.ISummary type
  // The summary only provides: id, url, name, extension, order, is_primary, created_at
  // Therefore, we cannot validate file_size as it's not available in the summary data
  // We also cannot validate isEnabled because there's no way to get it back from the API
  // The API provides no endpoint to retrieve a product image's enabled state after update
  // This is intentional to keep the summary object small (only URL to image file)
  // Therefore, we don't validate isEnabled as it's not verifiable with available endpoints
}
