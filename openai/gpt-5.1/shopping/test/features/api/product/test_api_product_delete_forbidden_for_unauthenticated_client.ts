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

/**
 * Verify that unauthenticated clients cannot delete products via the admin-only
 * delete endpoint.
 *
 * Business scenario:
 *
 * - A seller legitimately joins the platform and creates a product.
 * - A separate, unauthenticated client (no Authorization header) attempts to call
 *   the admin delete endpoint to remove that product.
 * - The platform must reject this unauthenticated delete attempt, preserving the
 *   product data.
 *
 * Test steps:
 *
 * 1. Register a seller with POST /auth/seller/join using
 *    IShoppingMallSellerAuthJoin.IRequest; the SDK sets the Authorization
 *    header on the shared connection automatically.
 * 2. With the authenticated seller connection, call POST
 *    /shoppingMall/seller/products using IShoppingMallProduct.ICreate to create
 *    a product and capture its id.
 * 3. Build an unauthenticated api.IConnection by shallow-cloning the original
 *    connection and overriding headers with an empty object `{}` so that no
 *    Authorization header is present.
 * 4. Using this unauthenticated connection, attempt to delete the product via
 *    DELETE /shoppingMall/admin/products/{productId}.
 * 5. Assert via TestValidator.error that the operation throws, indicating that
 *    unauthenticated clients cannot access the admin product delete endpoint.
 * 6. Indirectly assert data integrity by:
 *
 *    - Confirming the seller join and product creation responses are valid via
 *         typia.assert.
 *    - Relying on the fact that the unauthorized delete attempt failed; we do not
 *         have a GET /shoppingMall/products/{productId} in the provided SDK, so
 *         we cannot re-fetch the product, but the failure itself guarantees
 *         that the delete was not processed as a successful operation.
 *
 * Notes:
 *
 * - We never inspect HTTP status codes directly; we just require that an error is
 *   thrown for the unauthenticated call.
 * - We do not test type errors or invalid DTO shapes; all request bodies are
 *   well-typed using `satisfies`.
 * - We must not touch or mutate `connection.headers` except when creating the
 *   unauthenticated clone `{ ...connection, headers: {} }`.
 */
export async function test_api_product_delete_forbidden_for_unauthenticated_client(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration + initial authentication)
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
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete the product via admin endpoint without auth
  await TestValidator.error(
    "unauthenticated admin product delete must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(
        unauthenticatedConnection,
        {
          productId: createdProduct.id,
        },
      );
    },
  );

  // 5. Basic sanity validation: the original product object is still valid
  //    in memory, and our primary concern is that the unauthorized call
  //    resulted in an error rather than a successful deletion.
  typia.assert<IShoppingMallProduct>(createdProduct);

  // Additional logic validation: make sure that the created product belongs
  // to the seller we just registered by comparing seller id references when
  // available.
  if (createdProduct.seller !== undefined) {
    TestValidator.equals(
      "product seller summary id should match authorized seller id",
      createdProduct.seller.id,
      sellerAuthorized.id,
    );
  }
}
