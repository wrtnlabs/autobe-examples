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
 * Validate that an admin can upload a product image for a product (regardless
 * of ownership), and verify edge cases related to product-image upload
 * constraints.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin (POST /auth/admin/join), retrieve
 *    token.
 * 2. Create a new product with unique business code (POST
 *    /shopping/admin/products).
 * 3. Upload a valid product image (image_uri: JPEG/PNG URI, POST
 *    /shopping/admin/products/{code}/images). Confirm association,
 *    typia.assert, image.product code matches.
 * 4. Edge case: Try uploading to a non-existent product code (should error).
 * 5. Exceed image upload limit: Upload 10 images, then attempt 11th (should
 *    error).
 * 6. Upload with invalid file type URI (simulate non-jpg/png extension or scheme,
 *    should error).
 * 7. Simulate image "size" error by using a placeholder for large file (URI can't
 *    test real file, but backend constraint may catch unrealistically long URI
 *    or fixed string to trigger backend error for 5MB limit).
 */
export async function test_api_product_image_upload_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      role: RandomGenerator.pick([
        "super",
        "support",
        "compliance",
        "operator",
      ] as const),
      status: "active" as string & tags.MinLength<3> & tags.MaxLength<20>,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a new product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product = await api.functional.shopping.admin.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://cdn.example.com/images/seed.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "created product code matches",
    product.code,
    productCode,
  );

  // 3. Upload a valid product image (JPEG URI)
  const validImageUri =
    "https://cdn.example.com/product/test-img.jpg" as string &
      tags.Format<"uri">;
  const image = await api.functional.shopping.admin.products.images.create(
    connection,
    {
      productCode: productCode,
      body: {
        image_uri: validImageUri,
      } satisfies IShoppingProductImage.ICreate,
    },
  );
  typia.assert(image);
  TestValidator.equals(
    "image is associated with product",
    image.shopping_product_id,
    product.id,
  );

  // 4. Upload with non-existent product code
  await TestValidator.error(
    "upload image to non-existent product throws error",
    async () => {
      await api.functional.shopping.admin.products.images.create(connection, {
        productCode: RandomGenerator.alphaNumeric(24),
        body: {
          image_uri: "https://cdn.example.com/product/ghost.jpg" as string &
            tags.Format<"uri">,
        } satisfies IShoppingProductImage.ICreate,
      });
    },
  );

  // 5. Upload up to 10 images, then attempt 11th (exceed limit)
  await ArrayUtil.asyncRepeat(9, async (idx) => {
    const uri =
      `https://cdn.example.com/product/extra-img-${idx}.png` as string &
        tags.Format<"uri">;
    const extra = await api.functional.shopping.admin.products.images.create(
      connection,
      {
        productCode: productCode,
        body: {
          image_uri: uri,
        } satisfies IShoppingProductImage.ICreate,
      },
    );
    typia.assert(extra);
  });

  await TestValidator.error(
    "11th image upload for product exceeds limit",
    async () => {
      await api.functional.shopping.admin.products.images.create(connection, {
        productCode: productCode,
        body: {
          image_uri: "https://cdn.example.com/product/img11.jpeg" as string &
            tags.Format<"uri">,
        } satisfies IShoppingProductImage.ICreate,
      });
    },
  );

  // 6. Invalid file type (simulate by .gif URI)
  await TestValidator.error(
    "image_uri with invalid extension should fail",
    async () => {
      await api.functional.shopping.admin.products.images.create(connection, {
        productCode: productCode,
        body: {
          image_uri: "https://cdn.example.com/product/file.gif" as string &
            tags.Format<"uri">,
        } satisfies IShoppingProductImage.ICreate,
      });
    },
  );

  // 7. Simulate size error: extremely long URI for 5MB (backend usually expects binary, but just test long string on URI)
  // Create a bogus URI with length > 5MB
  const fiveMB = 5 * 1024 * 1024;
  const largeUri =
    "https://cdn.example.com/product/" +
    RandomGenerator.alphaNumeric(fiveMB - 40) +
    ".jpg";
  await TestValidator.error(
    "image_uri simulating >5MB image (by long URI) should fail",
    async () => {
      await api.functional.shopping.admin.products.images.create(connection, {
        productCode: productCode,
        body: {
          image_uri: largeUri as string & tags.Format<"uri">,
        } satisfies IShoppingProductImage.ICreate,
      });
    },
  );
}
