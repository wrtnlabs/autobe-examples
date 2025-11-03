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

/**
 * Test scenario: Platform admin deletes a product image.
 *
 * 1. Register and authenticate as a new admin.
 * 2. Create a product as the admin.
 * 3. Upload an image to the product.
 * 4. Delete the image using the admin endpoint.
 * 5. Attempt to delete the same image again and expect not-found error.
 * 6. Attempt to delete a non-existent image and expect not-found error.
 */
export async function test_api_product_image_admin_delete(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "superadmin",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a product as the admin
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://example.com/main-image.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Upload an image to the product
  const imageUpload: IShoppingProductImage =
    await api.functional.shopping.admin.products.images.create(connection, {
      productCode: product.code,
      body: {
        image_uri: "https://example.com/product-image.jpg",
      } satisfies IShoppingProductImage.ICreate,
    });
  typia.assert(imageUpload);

  // 4. Delete the image using the admin endpoint
  await api.functional.shopping.admin.products.images.erase(connection, {
    productCode: product.code,
    imageId: imageUpload.id,
  });

  // 5. Attempt to delete the same image again (should error)
  await TestValidator.error(
    "image already deleted should result in not found",
    async () => {
      await api.functional.shopping.admin.products.images.erase(connection, {
        productCode: product.code,
        imageId: imageUpload.id,
      });
    },
  );

  // 6. Attempt to delete a non-existent image id
  await TestValidator.error(
    "non-existent image id should result in not found",
    async () => {
      await api.functional.shopping.admin.products.images.erase(connection, {
        productCode: product.code,
        imageId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
