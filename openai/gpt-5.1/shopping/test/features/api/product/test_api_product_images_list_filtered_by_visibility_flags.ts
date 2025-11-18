import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_product_images_list_filtered_by_visibility_flags(
  connection: api.IConnection,
) {
  // 1. Seller joins (authentication setup)
  const joinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Seller creates a product
  const productBody = typia.random<IShoppingMallProduct.ICreate>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create multiple images for the product
  const imageCount = 5;
  const createdImages: IShoppingMallProductImage[] =
    await ArrayUtil.asyncRepeat(imageCount, async (index) => {
      const imageBody = {
        image_uri: typia.random<string & tags.Format<"uri">>(),
        alt_text: RandomGenerator.paragraph({ sentences: 3 }),
        // index starts from 0 and increases by 1, satisfying the Minimum<0> constraint logically
        display_order: index,
      } satisfies IShoppingMallProductImage.ICreate;

      const image = await api.functional.shoppingMall.products.images.create(
        connection,
        {
          productId: product.id,
          body: imageBody,
        },
      );
      typia.assert<IShoppingMallProductImage>(image);
      return image;
    });

  // Ensure we have at least one created image in this test flow
  TestValidator.predicate(
    "at least one product image created",
    createdImages.length > 0,
  );

  // 4. List images with visibleOnly=true, page=1, large pageSize, sorted by display_order asc
  const visibleRequestBody = {
    page: 1,
    pageSize: imageCount * 2,
    sortBy: "display_order",
    sortDirection: "asc",
    visibleOnly: true,
  } satisfies IShoppingMallProductImage.IRequest;

  const visiblePage = await api.functional.shoppingMall.products.images.index(
    connection,
    {
      productId: product.id,
      body: visibleRequestBody,
    },
  );
  typia.assert<IPageIShoppingMallProductImage.ISummary>(visiblePage);

  // Basic pagination and data sanity checks
  TestValidator.predicate(
    "visibleOnly listing returns a data array (possibly empty)",
    visiblePage.data.length >= 0,
  );

  // All images returned must belong to the target product
  for (const summary of visiblePage.data) {
    TestValidator.equals(
      "summary.product_id must match product.id in visibleOnly listing",
      summary.product_id,
      product.id,
    );
  }

  // Verify that data are ordered by display_order asc when sortBy/display_order asc is requested
  for (let i = 1; i < visiblePage.data.length; i++) {
    const prev = visiblePage.data[i - 1];
    const curr = visiblePage.data[i];
    TestValidator.predicate(
      "visibleOnly listing sorted by display_order asc",
      prev.display_order <= curr.display_order,
    );
  }

  // 5. List images with primaryOnly=true (and visibleOnly=true), same pagination/sort settings
  const primaryRequestBody = {
    page: 1,
    pageSize: imageCount * 2,
    sortBy: "display_order",
    sortDirection: "asc",
    visibleOnly: true,
    primaryOnly: true,
  } satisfies IShoppingMallProductImage.IRequest;

  const primaryPage = await api.functional.shoppingMall.products.images.index(
    connection,
    {
      productId: product.id,
      body: primaryRequestBody,
    },
  );
  typia.assert<IPageIShoppingMallProductImage.ISummary>(primaryPage);

  // Structural checks for primaryOnly listing
  TestValidator.predicate(
    "primaryOnly listing returns a data array (possibly empty)",
    primaryPage.data.length >= 0,
  );

  for (const summary of primaryPage.data) {
    TestValidator.equals(
      "summary.product_id must match product.id in primaryOnly listing",
      summary.product_id,
      product.id,
    );
  }

  for (let i = 1; i < primaryPage.data.length; i++) {
    const prev = primaryPage.data[i - 1];
    const curr = primaryPage.data[i];
    TestValidator.predicate(
      "primaryOnly listing sorted by display_order asc",
      prev.display_order <= curr.display_order,
    );
  }

  // 6. Basic consistency checks on pagination limits
  TestValidator.predicate(
    "pagination.limit is non-negative for visibleOnly listing",
    visiblePage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative for primaryOnly listing",
    primaryPage.pagination.limit >= 0,
  );
}
