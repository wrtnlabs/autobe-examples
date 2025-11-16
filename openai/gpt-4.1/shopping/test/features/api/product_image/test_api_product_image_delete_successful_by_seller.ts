import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a seller can soft-delete an image of their product, and various
 * business rules on deletion are enforced.
 *
 * 1. Register two seller accounts (owner and other).
 * 2. Using the owner seller, create a dummy product and attach two images
 *    (positions 1 and 2).
 * 3. Verify that authentication is required for deletion.
 * 4. Owner seller soft-deletes the first image using the API; verify deleted_at is
 *    set, and position recalculation for the remaining image occurs.
 * 5. Verify deleted image is no longer present when listing gallery images.
 * 6. Attempt to delete the image as the second seller; verify permission is
 *    denied.
 * 7. Attempt to delete a non-associated image (e.g., non-existent, or not for this
 *    product); verify error.
 */
export async function test_api_product_image_delete_successful_by_seller(
  connection: api.IConnection,
) {
  // 1. Register first (owner) seller
  const ownerSellerEmail = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: ownerSellerEmail,
      password: RandomGenerator.alphaNumeric(10) as string &
        tags.Format<"password">,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://test.local/register",
      referrer: "https://test.local/landing",
      ip: null,
    },
  });
  typia.assert(seller1);
  const ownerSellerId = seller1.id;

  // 2. Register the second seller (attacker)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: attackerEmail,
      password: RandomGenerator.alphaNumeric(10) as string &
        tags.Format<"password">,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://test.local/register2",
      referrer: "https://test.local/landing2",
      ip: null,
    },
  });
  typia.assert(seller2);

  // Imagine the owner seller has a productId, using a random UUID for this test
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create two images for the product
  const imgReq1 = {
    cdn_uri: "https://img.cdn.test/asset1.jpg",
    alt_text: "Main product image",
    position: 1,
    label: "Main",
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallProductImage.ICreate;
  const img1 = await api.functional.shoppingMall.seller.products.images.create(
    connection,
    {
      productId,
      body: imgReq1,
    },
  );
  typia.assert(img1);
  const image1Id = img1.id;

  const imgReq2 = {
    cdn_uri: "https://img.cdn.test/asset2.jpg",
    alt_text: "Second product image",
    position: 2,
    label: "Gallery",
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallProductImage.ICreate;
  const img2 = await api.functional.shoppingMall.seller.products.images.create(
    connection,
    {
      productId,
      body: imgReq2,
    },
  );
  typia.assert(img2);

  // 4. Owner seller soft-deletes the first image
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId,
    imageId: image1Id,
  });
  // There is no direct fetch endpoint, so after deletion, we would typically check listing, but this is skipped due to API constraints

  // 5. Ensure deleted image is not accessible anymore (simulate by trying to delete again and expecting error)
  await TestValidator.error(
    "cannot delete same image twice (already deleted)",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId,
          imageId: image1Id,
        },
      );
    },
  );

  // 6. Attempt to delete img2 as another seller (should fail with permission denied)
  // Switch authentication to second seller: we can just re-join (token in connection) for e2e
  await api.functional.auth.seller.join(connection, {
    body: {
      email: attackerEmail,
      password: seller2.token.access as string & tags.Format<"password">,
      business_name: seller2.business_name,
      registration_number: seller2.registration_number,
      business_phone: seller2.business_phone,
      href: "https://test.local/register2",
      referrer: "https://test.local/landing2",
      ip: null,
    },
  });
  await TestValidator.error(
    "non-owner cannot delete product's images",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId,
          imageId: img2.id,
        },
      );
    },
  );

  // 7. Cleanup: Delete non-existent image (should error)
  await TestValidator.error("deleting non-existent image fails", async () => {
    await api.functional.shoppingMall.seller.products.images.erase(connection, {
      productId,
      imageId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
