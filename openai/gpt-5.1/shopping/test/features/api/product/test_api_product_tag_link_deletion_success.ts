import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallProductTagLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTagLink";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate successful deletion of a product–tag link by the owning seller.
 *
 * Business flow covered by this test:
 *
 * 1. Register a seller and become authenticated as that seller.
 * 2. As seller, create a product and capture its id.
 * 3. Register an admin and authenticate as that admin.
 * 4. As admin, create a reusable product tag master and capture its id.
 * 5. Switch back to the seller account.
 * 6. As seller, create a product–tag link for the created product and tag.
 * 7. As seller, delete that product–tag link using the erase endpoint.
 *
 * The test validates:
 *
 * - All create/auth flows return correctly typed DTOs via typia.assert.
 * - The created tag link references the expected product_id and product_tag_id.
 * - The delete operation completes without throwing.
 *
 * Post-deletion re-read of the link is not possible with the provided SDK (no
 * GET/list endpoint for tag links), so absence is validated indirectly by the
 * successful completion of the erase call rather than by re-fetch.
 */
export async function test_api_product_tag_link_deletion_success(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) and becomes authenticated
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(8),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin joins and 4. logs in (explicit login to exercise both flows)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoined);

  // Explicit admin login to test login API and ensure token switching logic
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 5. Admin creates a product tag master
  const productTagCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: productTagCreateBody,
    });
  typia.assert<IShoppingMallProductTag>(productTag);

  // 6. Switch back to seller by logging in again with seller credentials
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 7. Seller creates a product–tag link for the created product and tag
  const tagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const productTagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: tagLinkCreateBody,
    });
  typia.assert<IShoppingMallProductTagLink>(productTagLink);

  // Validate that the created link is wired to the expected product and tag
  TestValidator.equals(
    "created tag link should reference the correct product_id",
    productTagLink.product_id,
    product.id,
  );

  TestValidator.equals(
    "created tag link should reference the correct product_tag_id",
    productTagLink.product_tag_id,
    productTag.id,
  );

  // 8. Seller deletes the product–tag link
  const productIdForErase = typia.assert<string & tags.Format<"uuid">>(
    product.id,
  );
  const productTagLinkIdForErase = typia.assert<string & tags.Format<"uuid">>(
    productTagLink.id,
  );

  await api.functional.shoppingMall.seller.products.tags.erase(connection, {
    productId: productIdForErase,
    productTagLinkId: productTagLinkIdForErase,
  });

  // If erase completes without throwing, consider deletion successful.
  // No direct re-fetch is possible with the provided SDK, so no further
  // type assertions are required for the void response.
}
