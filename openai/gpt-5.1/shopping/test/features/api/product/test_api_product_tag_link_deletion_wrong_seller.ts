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
 * Ensure that a seller cannot delete a product–tag link belonging to another
 * seller.
 *
 * Business workflow:
 *
 * 1. Register Seller A and obtain an authenticated seller session.
 * 2. As Seller A, create Product A.
 * 3. Register an Admin user and log in to obtain an admin session.
 * 4. As Admin, create a Product Tag master record.
 * 5. Switch back to Seller A and create a product–tag link (ProductTagLink A) for
 *    Product A.
 * 6. Register Seller B and obtain a separate seller session representing another
 *    tenant.
 * 7. As Seller B, attempt to delete ProductTagLink A on Product A via DELETE
 *    /shoppingMall/seller/products/{productId}/tags/{productTagLinkId}.
 * 8. Validate that this cross-tenant delete attempt fails with an HTTP error.
 * 9. Switch back to Seller A and successfully delete ProductTagLink A, proving
 *    that the link still existed after Seller B’s failed attempt and that only
 *    the owning seller can remove it.
 */
export async function test_api_product_tag_link_deletion_wrong_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A (owner of Product A)
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAJoinRequest = {
    email: sellerAEmail,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller-a.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller-a.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // 2. As Seller A, create Product A
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-a.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  // 3. Register Admin and log in
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. As Admin, create a Product Tag
  const productTagCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: productTagCreateBody,
    });
  typia.assert<IShoppingMallProductTag>(productTag);

  // 5. Switch back to Seller A and create ProductTagLink A
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAJoinRequest.password,
    ip: null,
    href: "https://seller-a.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller-a.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALogin);

  const tagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const productTagLinkA: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: productA.id,
      body: tagLinkCreateBody,
    });
  typia.assert<IShoppingMallProductTagLink>(productTagLinkA);

  // 6. Register Seller B as another tenant
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: "Password456!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller-b.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller-b.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 7. As Seller B, attempt to delete ProductTagLink A on Product A
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller-b.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller-b.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLogin);

  await TestValidator.error(
    "cross-tenant delete of product tag link must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.erase(connection, {
        productId: productA.id,
        productTagLinkId: productTagLinkA.id,
      });
    },
  );

  // 8. Switch back to Seller A and successfully delete ProductTagLink A
  const sellerAReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAReLogin);

  await api.functional.shoppingMall.seller.products.tags.erase(connection, {
    productId: productA.id,
    productTagLinkId: productTagLinkA.id,
  });
}
