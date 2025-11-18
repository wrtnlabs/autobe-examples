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

export async function test_api_product_images_list_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register seller (auth join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create product as this seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create 15 images for the product with known display_order 0..14
  const totalImages = 15;
  const pageSize = 10;

  for (let i = 0; i < totalImages; ++i) {
    const imageBody = {
      image_uri: typia.random<string & tags.Format<"uri">>(),
      alt_text: RandomGenerator.paragraph({ sentences: 1 }),
      display_order: i,
    } satisfies IShoppingMallProductImage.ICreate;

    const image: IShoppingMallProductImage =
      await api.functional.shoppingMall.products.images.create(connection, {
        productId: product.id,
        body: imageBody,
      });
    typia.assert(image);
  }

  // 4. First page request: page 1, asc by display_order
  const firstPageRequestBody = {
    page: 1,
    pageSize,
    sortBy: "display_order",
    sortDirection: "asc",
  } satisfies IShoppingMallProductImage.IRequest;

  const firstPage: IPageIShoppingMallProductImage.ISummary =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: firstPageRequestBody,
    });
  typia.assert(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  TestValidator.equals(
    "first page current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be pageSize",
    pagination1.limit,
    pageSize,
  );
  TestValidator.equals(
    "first page total records should be totalImages",
    pagination1.records,
    totalImages,
  );
  TestValidator.equals("first page pages should be 2", pagination1.pages, 2);

  TestValidator.equals(
    "first page data length should be 10",
    data1.length,
    pageSize,
  );

  // Verify first page images: product_id and display_order 0..9 asc
  data1.forEach((summary, index) => {
    typia.assert(summary);
    TestValidator.equals(
      `first page product_id should match product.id at index ${index}`,
      summary.product_id,
      product.id,
    );
    const expectedDisplayOrder = index;
    TestValidator.equals(
      `first page display_order should be ${expectedDisplayOrder} at index ${index}`,
      summary.display_order,
      expectedDisplayOrder,
    );
  });

  // Ensure strictly ascending and contiguous display_order on first page
  TestValidator.predicate(
    "first page display_order ascending and contiguous",
    () => {
      for (let i = 0; i < data1.length; ++i) {
        if (data1[i].display_order !== i) return false;
      }
      return true;
    },
  );

  // 5. Second page request: page 2, same sorting
  const secondPageRequestBody = {
    page: 2,
    pageSize,
    sortBy: "display_order",
    sortDirection: "asc",
  } satisfies IShoppingMallProductImage.IRequest;

  const secondPage: IPageIShoppingMallProductImage.ISummary =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: secondPageRequestBody,
    });
  typia.assert(secondPage);

  const pagination2 = secondPage.pagination;
  const data2 = secondPage.data;

  TestValidator.equals(
    "second page current page should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "second page limit should be pageSize",
    pagination2.limit,
    pageSize,
  );
  TestValidator.equals(
    "second page total records should still be totalImages",
    pagination2.records,
    totalImages,
  );
  TestValidator.equals(
    "second page pages should still be 2",
    pagination2.pages,
    2,
  );

  TestValidator.equals(
    "second page data length should be remaining 5 items",
    data2.length,
    totalImages - pageSize,
  );

  // Validate second page display_order values 10..14 and product_id
  data2.forEach((summary, index) => {
    typia.assert(summary);
    TestValidator.equals(
      `second page product_id should match product.id at index ${index}`,
      summary.product_id,
      product.id,
    );
    const expectedDisplayOrder = pageSize + index;
    TestValidator.equals(
      `second page display_order should be ${expectedDisplayOrder} at index ${index}`,
      summary.display_order,
      expectedDisplayOrder,
    );
  });

  // Ensure no overlap between page1 and page2 display_order
  const page1Orders = data1.map((d) => d.display_order).sort((a, b) => a - b);
  const page2Orders = data2.map((d) => d.display_order).sort((a, b) => a - b);

  TestValidator.predicate(
    "no overlap between page1 and page2 display_order",
    () => {
      for (const order1 of page1Orders) {
        if (page2Orders.includes(order1)) return false;
      }
      return true;
    },
  );

  // Also verify that combined orders cover 0..14
  const combinedOrders = [...page1Orders, ...page2Orders].sort((a, b) => a - b);
  TestValidator.predicate(
    "combined display_order values should be 0..14",
    () => {
      if (combinedOrders.length !== totalImages) return false;
      for (let i = 0; i < totalImages; ++i) {
        if (combinedOrders[i] !== i) return false;
      }
      return true;
    },
  );
}
