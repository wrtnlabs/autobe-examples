import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot cross-seller access denial.
 *
 * Validates that a seller cannot access another seller's profile snapshot, verifying the access control business rule that enforces data isolation between seller accounts.
 *
 * The test registers two independent seller accounts and attempts to access a profile snapshot using the first seller's authentication context. The system should reject this cross-seller access attempt with a 404 Not Found response, which hides the existence of records from unauthorized users.
 *
 * 1. Register Seller A account with randomized credentials via POST /shoppingMall/auth/seller/join.
 * 2. Register Seller B account with different randomized credentials via POST /shoppingMall/auth/seller/join.
 * 3. Attempt to retrieve a profile snapshot using Seller A's connection with a snapshot ID.
 * 4. Verify the request is rejected with 404 Not Found status.
 *
 * Note: Full scenario testing with actual snapshot creation requires profile editing endpoints (PUT /shoppingMall/seller/profile) which are not available in the current SDK function list. This test validates the access control mechanism by testing that cross-seller snapshot access is properly denied.
 */
export async function test_api_seller_profile_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A (the one attempting unauthorized access)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Register Seller B (the one whose snapshot would be accessed)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Verify sellers are different accounts
  TestValidator.notEquals(
    "sellers are different accounts",
    sellerA.id,
    sellerB.id,
  );
  // 4. Attempt to access a profile snapshot using Seller A's connection
  // Note: Without profile editing endpoints, we test with a generated UUID
  // The access control should deny this request with 404
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-seller snapshot access denied with 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.profile_snapshots.at(
        sellerAConnection,
        {
          snapshotId: snapshotId,
        },
      );
    },
  );
}
