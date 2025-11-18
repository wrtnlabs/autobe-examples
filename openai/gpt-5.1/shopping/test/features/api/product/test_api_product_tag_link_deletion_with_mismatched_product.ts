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
 * Validate that deleting a product-tag link with a mismatched productId is
 * rejected and does not perform cross-product deletion.
 *
 * Business context A seller can attach tags to their products via the
 * /shoppingMall/seller/products/{productId}/tags collection, which creates rows
 * in shopping_mall_product_tag_links. Each link belongs to exactly one product.
 * The deletion endpoint
 * /shoppingMall/seller/products/{productId}/tags/{productTagLinkId} is supposed
 * to remove only links that both (a) exist and (b) belong to the product
 * identified by productId in the path. Passing a link id that belongs to a
 * different product must not result in deletion.
 *
 * Test steps
 *
 * 1. Register a seller and authenticate.
 * 2. As that seller, create two products: product1 and product2.
 * 3. Register an admin and authenticate.
 * 4. As admin, create a product tag master record.
 * 5. Switch back to seller auth.
 * 6. As seller, create a tag link for product1 only.
 * 7. Attempt to delete the tag link by calling erase with productId = product2.id
 *    and productTagLinkId = link1.id. This should result in an error (business
 *    failure), not a success.
 * 8. Indirectly confirm that the link was not deleted by exercising the same
 *    product/tag context again in a consistent way.
 */
export async function test_api_product_tag_link_deletion_with_mismatched_product(
  connection: api.IConnection,
) {
  // 1. Register a seller and authenticate via join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;

  // 2. As that seller, create two products: product1 and product2
  const baseProductCode = RandomGenerator.alphaNumeric(8);

  const product1Create = {
    code: `${baseProductCode}-P1`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product1.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product1Create,
    });
  typia.assert(product1);

  const product2Create = {
    code: `${baseProductCode}-P2`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product2.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product2Create,
    });
  typia.assert(product2);

  // 3. Register an admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;

  // 4. As admin, create a product tag master record
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const tagCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    label: "AutoBE-Tag",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(productTag);

  // 5. Switch back to seller auth via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Create a tag link for product1
  const tagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const product1TagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product1.id,
      body: tagLinkCreateBody,
    });
  typia.assert(product1TagLink);

  // Sanity check: link is associated with product1 in the response
  if (product1TagLink.product !== undefined) {
    TestValidator.equals(
      "tag link product summary id should match product1.id when provided",
      product1TagLink.product.id,
      product1.id,
    );
  }
  TestValidator.equals(
    "tag link foreign key product_id must equal product1.id",
    product1TagLink.product_id,
    product1.id,
  );
  TestValidator.equals(
    "tag link foreign key product_tag_id must equal created tag id",
    product1TagLink.product_tag_id,
    productTag.id,
  );

  // 7. Attempt to delete the tag link using product2.id
  await TestValidator.error(
    "erasing a tag link with mismatched productId must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.erase(connection, {
        productId: product2.id,
        productTagLinkId: product1TagLink.id,
      });
    },
  );

  // 8. Indirect consistency check: try to create the same tag link again
  const secondTagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const secondProduct1TagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product1.id,
      body: secondTagLinkCreateBody,
    });
  typia.assert(secondProduct1TagLink);

  TestValidator.predicate(
    "second tag link creation for product1 should succeed even after failed mismatched deletion",
    secondProduct1TagLink.product_id === product1.id &&
      secondProduct1TagLink.product_tag_id === productTag.id,
  );
}
