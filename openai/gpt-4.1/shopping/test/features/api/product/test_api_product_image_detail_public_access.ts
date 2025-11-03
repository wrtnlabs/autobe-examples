import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
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
 * Test public access to a specific product image detail.
 *
 * This scenario tests the ability to retrieve metadata for a product image
 * using its product business code and image UUID as a public user. The test
 * covers both the success case (with an active/published product and valid
 * image) and error cases, ensuring that mismatched and non-existent records are
 * correctly handled by the platform.
 *
 * Steps:
 *
 * 1. Register a new seller account (setup for product/image creation).
 * 2. Create a new product as the newly registered seller (use active/published
 *    status).
 * 3. Upload an image to the product and capture its imageId.
 * 4. As a public (unauthenticated) user, retrieve the specific product image by
 *    productCode and imageId and confirm all expected metadata fields.
 * 5. Attempt to retrieve a non-existent image (random UUID) for a valid product
 *    and confirm error is thrown.
 * 6. Attempt to retrieve the valid imageId using an incorrect product code and
 *    confirm error is thrown.
 */
export async function test_api_product_image_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const email = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: "!Passw0rd123",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create a new product (ensure status is 'active' for public visibility)
  const code = RandomGenerator.alphaNumeric(10);
  const productBody = {
    code,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
    main_image_uri: typia.random<string & tags.Format<"uri">>(),
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);

  // 3. Upload an image to the product, capture imageId
  const uploadedImage =
    await api.functional.shopping.seller.products.images.create(connection, {
      productCode: code,
      body: {
        image_uri: typia.random<string & tags.Format<"uri">>(),
        order_index: undefined,
      } satisfies IShoppingProductImage.ICreate,
    });
  typia.assert(uploadedImage);

  // 4. Publicly retrieve the uploaded image by (productCode, imageId)
  // Use a public/unauthenticated connection (reset headers)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const imageDetail = await api.functional.shopping.products.images.at(
    publicConn,
    {
      productCode: code,
      imageId: uploadedImage.id,
    },
  );
  typia.assert(imageDetail);
  TestValidator.equals(
    "retrieved image id matches uploaded",
    imageDetail.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "image uri matches uploaded",
    imageDetail.image_uri,
    uploadedImage.image_uri,
  );
  TestValidator.equals(
    "order index matches uploaded",
    imageDetail.order_index,
    uploadedImage.order_index,
  );
  TestValidator.equals(
    "creation timestamp matches uploaded",
    imageDetail.created_at,
    uploadedImage.created_at,
  );
  TestValidator.equals(
    "shopping_product_id matches created product",
    imageDetail.shopping_product_id,
    product.id,
  );

  // 5. Attempt to retrieve a non-existent image id for the product (expect error)
  const randomImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent image should fail",
    async () => {
      await api.functional.shopping.products.images.at(publicConn, {
        productCode: code,
        imageId: randomImageId,
      });
    },
  );

  // 6. Attempt to retrieve the uploaded image under a mismatched product code (expect error)
  const wrongProductCode = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "fetching image with wrong product code should fail",
    async () => {
      await api.functional.shopping.products.images.at(publicConn, {
        productCode: wrongProductCode,
        imageId: uploadedImage.id,
      });
    },
  );
}
