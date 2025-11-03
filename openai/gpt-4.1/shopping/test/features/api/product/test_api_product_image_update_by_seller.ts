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
 * Validates seller's ability to update a product image (e.g., replacement,
 * display order) and checks appropriate rejection on invalid use
 * (ownership/validation).
 *
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Seller adds an image to the product
 * 4. Seller updates product image: replaces with new valid image and changes
 *    display order
 * 5. Verifies product image is updated
 * 6. Attempts update with invalid file (wrong type/size)—should be rejected
 * 7. New seller attempts update on image of other's product—should be rejected
 */
export async function test_api_product_image_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(12);
  const createProduct = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://example.com/img1.png",
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(createProduct);
  TestValidator.equals("product code matches", createProduct.code, productCode);

  // 3. Seller adds an image
  const initialImageUri = "https://example.com/pimg1.png";
  const initialImage =
    await api.functional.shopping.seller.products.images.create(connection, {
      productCode: productCode,
      body: {
        image_uri: initialImageUri,
        order_index: 0,
      } satisfies IShoppingProductImage.ICreate,
    });
  typia.assert(initialImage);
  TestValidator.equals(
    "image uri matches",
    initialImage.image_uri,
    initialImageUri,
  );

  // 4. Seller updates image (valid new image, new order)
  const updatedImageUri = "https://example.com/pimg1_updated.jpg";
  const updateResp =
    await api.functional.shopping.seller.products.images.update(connection, {
      productCode: productCode,
      imageId: initialImage.id,
      body: {
        image_uri: updatedImageUri,
        order_index: 1,
      } satisfies IShoppingProductImage.IUpdate,
    });
  typia.assert(updateResp);
  TestValidator.equals(
    "image_uri updated",
    updateResp.image_uri,
    updatedImageUri,
  );
  TestValidator.equals("order_index updated", updateResp.order_index, 1);

  // 5. Confirm reflect in subsequent update response (already above)

  // 6. Try update with invalid file type (should fail)
  await TestValidator.error("rejects non-image file type", async () => {
    await api.functional.shopping.seller.products.images.update(connection, {
      productCode: productCode,
      imageId: initialImage.id,
      body: {
        image_uri: "https://example.com/file.txt", // Not .jpg/.png
      } satisfies IShoppingProductImage.IUpdate,
    });
  });

  // 6b. Try update with oversized file (should fail)
  await TestValidator.error("rejects oversized images", async () => {
    // Here we just provide plausible URI, validation will happen backend-side
    await api.functional.shopping.seller.products.images.update(connection, {
      productCode: productCode,
      imageId: initialImage.id,
      body: {
        image_uri: "https://example.com/pimg_oversize.jpg",
      } satisfies IShoppingProductImage.IUpdate,
    });
  });

  // 7. New seller (not owner) attempts to update image (should fail)
  const anotherSellerEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.seller.join(connection, {
    body: {
      email: anotherSellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  await TestValidator.error("rejects image update by non-owner", async () => {
    await api.functional.shopping.seller.products.images.update(connection, {
      productCode: productCode,
      imageId: initialImage.id,
      body: {
        image_uri: "https://example.com/unauth.png",
      } satisfies IShoppingProductImage.IUpdate,
    });
  });
}
