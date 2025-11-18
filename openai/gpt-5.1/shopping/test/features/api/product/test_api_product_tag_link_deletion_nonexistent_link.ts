import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate deletion behavior for a non-existent product–tag link.
 *
 * Business context: A seller can manage tag associations for their products
 * through `shopping_mall_product_tag_links` records, and the DELETE endpoint
 * `/shoppingMall/seller/products/{productId}/tags/{productTagLinkId}` removes a
 * specific link between a product and a tag. When a seller attempts to delete a
 * link that does not exist for the given product, the system must respond with
 * an error instead of silently succeeding or altering catalog state.
 *
 * Since we only have join, create-product, and delete-link APIs in this context
 * (and no tag-link creation or listing), we cannot directly observe tag-link
 * state. Instead, we:
 *
 * - Ensure that authentication and product creation succeed,
 * - Issue a DELETE for a random, non-existent `productTagLinkId`, and
 * - Confirm that the DELETE call fails (throws) while the seller session and
 *   product object remain valid.
 *
 * Test steps:
 *
 * 1. Register a new seller using POST /auth/seller/join, providing a valid
 *    IShoppingMallSellerAuthJoin.IRequest payload. The SDK will automatically
 *    apply the returned access token to the connection headers, so subsequent
 *    requests run as this seller.
 * 2. Create a new product for this seller using POST /shoppingMall/seller/products
 *    with a valid IShoppingMallProduct.ICreate body and assert the response
 *    type as IShoppingMallProduct via typia.assert.
 * 3. Generate a random UUID value to use as `productTagLinkId` that should not
 *    correspond to any existing `shopping_mall_product_tag_links` row.
 * 4. Invoke DELETE
 *    /shoppingMall/seller/products/{productId}/tags/{productTagLinkId} via
 *    api.functional.shoppingMall.seller.products.tags.erase, passing the
 *    existing product.id and the random productTagLinkId.
 * 5. Use TestValidator.error (with await and async callback) to assert that the
 *    erase call throws, indicating that the non-existent link cannot be
 *    removed.
 * 6. As an additional sanity check, rely on earlier typia.assert calls to ensure
 *    that the join and product creation responses remained structurally valid;
 *    no additional state assertions are possible without tag-link listing
 *    APIs.
 */
export async function test_api_product_tag_link_deletion_nonexistent_link(
  connection: api.IConnection,
) {
  // 1. Register seller via /auth/seller/join
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product owned by the authenticated seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
    model_name: null,
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Generate a random, presumably non-existent productTagLinkId
  const nonExistentTagLinkId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4-5. Attempt to delete the non-existent product–tag link and
  //       assert that an error is thrown.
  await TestValidator.error(
    "deleting non-existent product-tag link should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.erase(connection, {
        productId: product.id,
        productTagLinkId: nonExistentTagLinkId,
      });
    },
  );

  // 6. Sanity: previously asserted types via typia.assert ensure that the
  //    seller and product objects remain structurally valid. No further
  //    state checks for tag links are possible with current APIs.
}
