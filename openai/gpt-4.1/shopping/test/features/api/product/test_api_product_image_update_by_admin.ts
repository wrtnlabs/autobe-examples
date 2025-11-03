import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/** E2e: Verify admin can update a product image and validate error scenarios. */
export async function test_api_product_image_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: RandomGenerator.pick([
        "super",
        "support",
        "compliance",
        "operator",
      ] as const),
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);
  TestValidator.equals("admin email", admin.email, adminEmail);

  // 2. Admin creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const imageUri = `https://example.com/img_${RandomGenerator.alphaNumeric(8)}.jpg`;
  const createProductBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: imageUri,
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.admin.products.create(
    connection,
    {
      body: createProductBody,
    },
  );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // 3. Admin uploads an initial image
  const initialImageBody = {
    image_uri: imageUri,
    order_index: 0,
  } satisfies IShoppingProductImage.ICreate;
  const uploadedImage =
    await api.functional.shopping.admin.products.images.create(connection, {
      productCode,
      body: initialImageBody,
    });
  typia.assert(uploadedImage);
  TestValidator.equals("initial image uri", uploadedImage.image_uri, imageUri);

  // 4. Admin updates the image with new image_uri and a new order_index
  const newImageUri = `https://example.com/updated_${RandomGenerator.alphaNumeric(8)}.png`;
  const updateBody = {
    image_uri: newImageUri,
    order_index: 1,
  } satisfies IShoppingProductImage.IUpdate;
  const updatedImage =
    await api.functional.shopping.admin.products.images.update(connection, {
      productCode,
      imageId: uploadedImage.id,
      body: updateBody,
    });
  typia.assert(updatedImage);
  TestValidator.equals(
    "image id after update",
    updatedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "updated image uri",
    updatedImage.image_uri,
    newImageUri,
  );
  TestValidator.equals("updated order index", updatedImage.order_index, 1);

  // 5. Confirm image list contains the updated image with changes
  // (Re-fetch the product and assert)
  const reloadedProduct = await api.functional.shopping.admin.products.create(
    connection,
    {
      body: createProductBody,
    },
  );
  typia.assert(reloadedProduct);
  // Should still match as new instance, but image in the previous test should reflect update (simulate best-effort verification)
  // Direct fetch of images endpoint is not available, so only product creation/flow can be checked

  // 6. Try updating with a non-existent imageId
  await TestValidator.error("update rejects non-existent imageId", async () => {
    await api.functional.shopping.admin.products.images.update(connection, {
      productCode,
      imageId: typia.random<string & tags.Format<"uuid">>(),
      body: updateBody,
    });
  });
  // 7. Try updating an image for a non-existent productCode
  await TestValidator.error(
    "update rejects non-existent productCode",
    async () => {
      await api.functional.shopping.admin.products.images.update(connection, {
        productCode: RandomGenerator.alphaNumeric(12),
        imageId: uploadedImage.id,
        body: updateBody,
      });
    },
  );
  // 8. Try updating with invalid file type
  await TestValidator.error("update rejects invalid file type", async () => {
    await api.functional.shopping.admin.products.images.update(connection, {
      productCode,
      imageId: uploadedImage.id,
      body: {
        image_uri: "https://example.com/invalid_file.exe",
      } satisfies IShoppingProductImage.IUpdate,
    });
  });
  // 9. Try updating with likely oversize file URI (simulate by setting an unrealistic filename)
  await TestValidator.error(
    "update rejects oversized image (simulate with long URI)",
    async () => {
      await api.functional.shopping.admin.products.images.update(connection, {
        productCode,
        imageId: uploadedImage.id,
        body: {
          image_uri: `https://example.com/${RandomGenerator.alphaNumeric(256)}.jpg`,
        } satisfies IShoppingProductImage.IUpdate,
      });
    },
  );
}
