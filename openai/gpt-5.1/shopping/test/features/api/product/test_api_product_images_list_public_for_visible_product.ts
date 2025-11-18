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

/**
 * Verify public listing and sorting of product images for an active product.
 *
 * Business goal: Ensure that storefront clients (unauthenticated users) can
 * retrieve gallery images for a publicly visible product using the index
 * endpoint PATCH /shoppingMall/products/{productId}/images, and that the images
 * are paginated and sorted correctly by display_order.
 *
 * Scenario steps:
 *
 * 1. Register a seller using POST /auth/seller/join to obtain an authenticated
 *    seller context and underlying Authorization header.
 * 2. As this seller, create a product via POST /shoppingMall/seller/products using
 *    IShoppingMallProduct.ICreate with status set to a visible state like
 *    "active" and a valid primary_image_uri and default_locale.
 * 3. As the same seller, create multiple product images via POST
 *    /shoppingMall/products/{productId}/images with distinct display_order
 *    values (for example: 2, 0, 1) and varying alt_text values (some non-null,
 *    some null) using IShoppingMallProductImage.ICreate.
 * 4. Construct an unauthenticated connection object by spreading the original
 *    connection and setting headers: {} in a single step, without touching
 *    headers afterwards.
 * 5. On the unauthenticated connection, call
 *    api.functional.shoppingMall.products.images.index with:
 *
 *    - ProductId: the id of the created product
 *    - Body: IShoppingMallProductImage.IRequest with page: 1, pageSize: a value >=
 *         number of created images (e.g. 10), sortBy: "display_order",
 *         sortDirection: "asc", visibleOnly and primaryOnly left undefined
 * 6. Validate the response:
 *
 *    - Type-check the response with
 *         typia.assert<IPageIShoppingMallProductImage.ISummary>().
 *    - Assert pagination.limit is at least the number of created images.
 *    - Assert pagination.records equals the number of created images.
 *    - Assert data.length equals the number of created images.
 *    - Assert that the sequence of data[i].image_uri values matches the order of the
 *         created images when sorted ascending by display_order.
 *
 * Key validations:
 *
 * - Product image listing works without authentication (no Authorization header).
 * - Index endpoint respects page, pageSize, sortBy="display_order", and
 *   sortDirection="asc".
 * - Returned IShoppingMallProductImage.ISummary items have the expected id,
 *   product_id matching the product, image_uri, alt_text, and display_order
 *   values.
 */
export async function test_api_product_images_list_public_for_visible_product(
  connection: api.IConnection,
) {
  // 1. Register a seller to get authenticated seller context
  const joinRequestBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create an active/visible product for this seller
  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create multiple product images with different display_order values
  const productId = product.id;

  const imagePayloads: IShoppingMallProductImage.ICreate[] = [
    {
      image_uri: "https://cdn.example.com/images/img-order-2.jpg" as string &
        tags.Format<"uri">,
      alt_text: "Order 2 image",
      display_order: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    {
      image_uri: "https://cdn.example.com/images/img-order-0.jpg" as string &
        tags.Format<"uri">,
      alt_text: null,
      display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    {
      image_uri: "https://cdn.example.com/images/img-order-1.jpg" as string &
        tags.Format<"uri">,
      alt_text: "Order 1 image",
      display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  ];

  const createdImages: IShoppingMallProductImage[] = [];
  for (const payload of imagePayloads) {
    const created: IShoppingMallProductImage =
      await api.functional.shoppingMall.products.images.create(connection, {
        productId,
        body: payload,
      });
    typia.assert<IShoppingMallProductImage>(created);
    createdImages.push(created);
  }

  // Prepare expected order by ascending display_order
  const expectedOrdered = [...createdImages].sort(
    (a, b) => a.display_order - b.display_order,
  );

  // 4. Create unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Call index on unauthenticated connection with sorting by display_order asc
  const pageSize = 10;
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "display_order",
    sortDirection: "asc",
  } satisfies IShoppingMallProductImage.IRequest;

  const pageResult: IPageIShoppingMallProductImage.ISummary =
    await api.functional.shoppingMall.products.images.index(
      unauthenticatedConnection,
      {
        productId: productId as string & tags.Format<"uuid">,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductImage.ISummary>(pageResult);

  const createdCount = createdImages.length;

  // 6. Validate pagination and data correctness
  TestValidator.predicate(
    "pagination.limit should be >= created image count",
    pageResult.pagination.limit >= createdCount,
  );

  TestValidator.equals(
    "pagination.records should equal created image count",
    pageResult.pagination.records,
    createdCount,
  );

  TestValidator.equals(
    "data length should equal created image count",
    pageResult.data.length,
    createdCount,
  );

  // Map expected and actual image_uri sequences to compare
  const actualUris = pageResult.data.map((d) => d.image_uri);
  const expectedUris = expectedOrdered.map((img) => img.image_uri);

  TestValidator.equals(
    "image_uri sequence should follow ascending display_order",
    actualUris,
    expectedUris,
  );

  // Additionally confirm that each summary points back to the correct product
  for (const summary of pageResult.data) {
    TestValidator.equals(
      "summary.product_id should equal product.id",
      summary.product_id,
      product.id as string & tags.Format<"uuid">,
    );
  }
}
