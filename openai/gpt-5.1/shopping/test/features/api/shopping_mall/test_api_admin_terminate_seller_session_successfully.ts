import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_terminate_seller_session_successfully(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminEmail: string & tags.Format<"email"> = adminJoined.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 2. Admin logs in explicitly (exercise login flow and ensure token switching works)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  const sellerId: string & tags.Format<"uuid"> = sellerJoined.id;
  const sellerEmail: string & tags.Format<"email"> = sellerJoined.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 4. Seller logs in again to simulate separate session (and to ensure seller login path is correct)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  TestValidator.equals(
    "seller id from login must match join",
    sellerLoggedIn.id,
    sellerId,
  );

  // 5. Using seller context, create a product to prove seller-only API works
  const initialProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const initialProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: initialProductBody,
    });
  typia.assert(initialProduct);

  TestValidator.equals(
    "created product must belong to seller",
    initialProduct.shopping_mall_seller_id,
    sellerId,
  );

  if (initialProduct.seller !== undefined) {
    TestValidator.equals(
      "product.seller summary id should match sellerId",
      initialProduct.seller.id,
      sellerId,
    );
  }

  // 6. Switch back to admin by logging in again (ensures Authorization header is admin token)
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 7. Admin terminates a seller session via DELETE /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId}
  const targetSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.admin.sellers.sessions.erase(connection, {
    sellerId,
    sessionId: targetSessionId,
  });

  // 8. Validate that admin token cannot be used as seller to create a product.
  //    This simulates that a terminated/non-seller session cannot call seller-only endpoints.
  const invalidProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "admin token cannot call seller-only product creation",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: invalidProductBody,
      });
    },
  );

  // 9. Seller logs in again to obtain a fresh session and confirm seller operations still work
  const sellerRelogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogged);

  TestValidator.equals(
    "seller id after relogin should remain the same",
    sellerRelogged.id,
    sellerId,
  );

  const postTerminationProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const postTerminationProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: postTerminationProductBody,
    });
  typia.assert(postTerminationProduct);

  TestValidator.equals(
    "post-termination product must also belong to seller",
    postTerminationProduct.shopping_mall_seller_id,
    sellerId,
  );
}
