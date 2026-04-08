import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that retrieving a non-existent or soft-deleted seller's profile returns 404 Not Found.
 *
 * Validates the API behavior when attempting to access a seller profile that does not exist in the system. This includes both sellers that were never created and sellers that have been soft-deleted. The API should return HTTP 404 Not Found to prevent access to non-existent or deleted seller accounts, preserving data privacy while maintaining proper error handling.
 *
 * Note: Since no seller deletion endpoint is available in the current API, this test validates the 404 behavior using a non-existent seller ID, which represents the same outcome as accessing a soft-deleted seller.
 *
 * 1. Register a new seller account to establish valid authentication pattern.
 * 2. Verify the registered seller can be retrieved successfully.
 * 3. Generate a random UUID that does not exist in the system.
 * 4. Call GET /shoppingMall/sellers/{sellerId} with the non-existent UUID.
 * 5. Verify the response returns HTTP 404 Not Found.
 * 6. This validates that the API correctly handles requests for non-existent or deleted sellers.
 */
export async function test_api_seller_profile_retrieve_deleted_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account to establish authentication pattern
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Verify the registered seller can be retrieved successfully (positive test)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedSeller = await api.functional.shoppingMall.sellers.at(
    publicConnection,
    { sellerId: seller.id },
  );
  typia.assert(retrievedSeller);
  TestValidator.equals("seller ID matches", retrievedSeller.id, seller.id);
  // 3. Generate a random UUID that does not exist in the system
  const nonExistentSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent seller profile
  // This should throw an HttpError with status 404
  await TestValidator.httpError(
    "retrieving non-existent seller returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.sellers.at(publicConnection, {
        sellerId: nonExistentSellerId,
      }),
  );
}
