import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that attempting to update a non-existent product returns 404 Not Found.
 *
 * Validates proper error handling when an authenticated seller attempts to update
 * a product using a UUID that does not exist in the system. This test ensures that
 * the system correctly reports missing resources with appropriate HTTP 404 status
 * code, preventing ambiguous error responses for invalid product identifiers.
 *
 * The test authenticates as a seller and attempts to update a product with a
 * randomly generated UUID that is guaranteed not to exist. The endpoint must
 * return 404 Not Found to indicate the resource was not found, not 400 Bad Request
 * or other error codes.
 *
 * 1. Seller registers account via join endpoint.
 * 2. Seller authenticates to obtain JWT tokens.
 * 3. Generate a random UUID that does not correspond to any existing product.
 * 4. Attempt to update the non-existent product with valid update payload.
 * 5. Validate that the endpoint returns HTTP 404 status code.
 */
export async function test_api_product_update_nonexistent_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
    },
  });
  // 2. Login as the seller to get authenticated session
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(authenticatedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPassword123!",
      href: "https://example.com/seller/login",
      referrer: "https://example.com/",
    },
  });
  // 3. Generate a random UUID that does not exist in the system
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to update the non-existent product
  // 5. Validate that the endpoint returns 404 Not Found
  await TestValidator.httpError(
    "update non-existent product returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.products.putByProductid(
        authenticatedSellerConnection,
        {
          productId: nonExistentProductId,
          body: {
            name: "Updated Product Name",
            description: "Updated description",
            basePrice: 9999,
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      ),
  );
}
