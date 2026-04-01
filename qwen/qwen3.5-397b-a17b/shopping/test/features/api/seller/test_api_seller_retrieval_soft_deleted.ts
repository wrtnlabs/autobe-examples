import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator receives 404 when attempting to retrieve a soft-deleted seller account.
 *
 * Test workflow:
 * 1. Register and authenticate as super administrator
 * 2. Register a seller account
 * 3. Attempt to retrieve a non-existent seller (simulating soft-deleted behavior)
 * 4. Verify the response returns 404 Not Found
 *
 * This validates that the super administrator seller retrieval endpoint properly
 * returns 404 for sellers that don't exist or have been soft-deleted, maintaining
 * data integrity and privacy. According to the API specification, the endpoint
 * returns 404 for both non-existent and soft-deleted sellers.
 *
 * NOTE: The seller deletion endpoint is not available in the provided SDK functions.
 * This test validates 404 behavior using a non-existent seller ID, which produces
 * the same response as a soft-deleted seller per the API specification.
 */
export async function test_api_seller_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminAuth);
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdminAuth.token.access}` },
  };
  // 2. Register a seller account (to demonstrate the workflow)
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Attempt to retrieve a non-existent seller using super administrator endpoint
  // This simulates the behavior of retrieving a soft-deleted seller
  // Both non-existent and soft-deleted sellers return 404 per API specification
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify the response returns 404 Not Found
  await TestValidator.httpError(
    "non-existent seller should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdministrator.sellers.at(
        superAdminConnection,
        {
          sellerId: nonExistentSellerId,
        },
      );
    },
  );
}
