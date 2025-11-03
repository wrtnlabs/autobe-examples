import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingProductImage";
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
 * Test retrieval of product images as a public user by product code.
 *
 * 1. Register a new seller via seller join.
 * 2. Seller creates a new product with status 'active'.
 * 3. Seller uploads multiple images to the product.
 * 4. As a public user (no authentication), retrieves product images with default
 *    paging and sorting.
 * 5. Paginates to verify pagination works.
 * 6. Retrieves with different sorting orders.
 * 7. Attempts retrieve on non-existent product code, expects error.
 * 8. Archives the product by changing its status to 'archived' and attempts to
 *    retrieve images, expects error (not found or not listed).
 */
export async function test_api_product_images_public_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new seller via seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Seller creates a new product (status must be 'active')
  const productCode = RandomGenerator.alphaNumeric(10);
  const mainImageUri =
    "https://example.com/image/main/" +
    RandomGenerator.alphaNumeric(12) +
    ".jpg";
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        main_image_uri: mainImageUri,
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Upload multiple images for the product
  const imageCount = 5;
  const uploadedImages: IShoppingProductImage[] = await ArrayUtil.asyncRepeat(
    imageCount,
    async (idx) => {
      const imageUri = `https://example.com/image/${productCode}/${RandomGenerator.alphaNumeric(10)}.jpg`;
      const image: IShoppingProductImage =
        await api.functional.shopping.seller.products.images.create(
          connection,
          {
            productCode: product.code,
            body: {
              image_uri: imageUri,
              order_index: idx,
            } satisfies IShoppingProductImage.ICreate,
          },
        );
      typia.assert(image);
      return image;
    },
  );

  // 4. Retrieve product images as a public user (no special authentication required)
  const respDefault = await api.functional.shopping.products.images.index(
    connection,
    {
      productCode: product.code,
      body: {
        product_code: product.code,
      } satisfies IShoppingProductImage.IRequest,
    },
  );
  typia.assert(respDefault);
  TestValidator.equals(
    "retrieved product image count equals upload count",
    respDefault.data.length,
    imageCount,
  );
  // Compare the order/index/uris
  ArrayUtil.repeat(imageCount, (idx) => {
    TestValidator.equals(
      `image uri at index ${idx}`,
      respDefault.data[idx].image_uri,
      uploadedImages[idx].image_uri,
    );
    TestValidator.equals(
      `order index at index ${idx}`,
      respDefault.data[idx].order_index,
      idx,
    );
  });

  // 5. Paginate the list and confirm correct subset
  const respPaginate = await api.functional.shopping.products.images.index(
    connection,
    {
      productCode: product.code,
      body: {
        product_code: product.code,
        page: 1,
        limit: 2,
      } satisfies IShoppingProductImage.IRequest,
    },
  );
  typia.assert(respPaginate);
  TestValidator.equals(
    "pagination returns page 1",
    respPaginate.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page size is 2",
    respPaginate.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination data is page size",
    respPaginate.data.length,
    2,
  );

  // 6. Retrieve with sort by order_index descending
  const respDesc = await api.functional.shopping.products.images.index(
    connection,
    {
      productCode: product.code,
      body: {
        product_code: product.code,
        order_by: "order_index",
        order_direction: "desc",
      } satisfies IShoppingProductImage.IRequest,
    },
  );
  typia.assert(respDesc);
  // The first image should have the highest order_index
  TestValidator.equals(
    "first image in desc sort has max order_index",
    respDesc.data[0].order_index,
    imageCount - 1,
  );

  // 7. Retrieve images for non-existent product code (should error)
  await TestValidator.error(
    "retrieval for non-existent product should fail",
    async () => {
      await api.functional.shopping.products.images.index(connection, {
        productCode: "nonexistent" + RandomGenerator.alphaNumeric(10),
        body: {
          product_code: "nonexistent" + RandomGenerator.alphaNumeric(10),
        } satisfies IShoppingProductImage.IRequest,
      });
    },
  );

  // 8. (Business logic expectation) Archived product images retrieval
  // Here, we can't update product status directly because no API is provided, so we skip this negative test.
}
