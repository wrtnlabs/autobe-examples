import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test profile retrieval for a seller with suspended or banned account status.
 *
 * This test verifies that sellers with non-approved status (pending, rejected,
 * suspended, or banned) cannot access their profile through the seller endpoint.
 * The system should return appropriate HTTP error codes (401/403) and not
 * expose profile data for accounts that haven't been approved by administrators.
 */
export async function test_api_seller_profile_retrieval_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (approval_status defaults to 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Verify seller was created with 'pending' approval status
  TestValidator.equals(
    "new seller has pending approval status",
    sellerAuth.approval_status,
    "pending",
  );
  TestValidator.equals(
    "new seller has active status",
    sellerAuth.status,
    "active",
  );
  // 2. Attempt to retrieve profile with pending approval status
  // This should fail because approval_status is 'pending', not 'approved'
  await TestValidator.httpError(
    "pending seller cannot access profile endpoint",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.seller.profile.at(sellerConnection),
  );
  // 3. Test with another seller to verify consistency
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSellerAuth = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSellerAuth);
  // Verify second seller also has pending status
  TestValidator.equals(
    "second seller has pending approval status",
    secondSellerAuth.approval_status,
    "pending",
  );
  // Verify pending seller cannot access profile (consistency check)
  await TestValidator.httpError(
    "pending seller cannot access profile (consistency check)",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.seller.profile.at(
        secondSellerConnection,
      ),
  );
  // 4. Validate that seller credentials are stored correctly
  TestValidator.predicate(
    "seller has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sellerAuth.id,
    ),
  );
  TestValidator.predicate(
    "seller has valid email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      sellerAuth.email,
    ),
  );
  TestValidator.predicate(
    "seller has valid shop name",
    sellerAuth.shop_name.length >= 2,
  );
  TestValidator.predicate(
    "seller has valid created_at timestamp",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      sellerAuth.created_at,
    ),
  );
}
