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
 * Test login rejection for a banned seller account.
 *
 * This test validates that new seller accounts are created with banned=false,
 * which is a prerequisite for the banned seller login rejection flow.
 *
 * Expected complete flow (requires admin banning endpoint):
 * 1. Create a seller account via join endpoint
 * 2. Administrator bans the seller account (set banned=true)
 * 3. Attempt login with banned seller's credentials
 * 4. Verify login is rejected with 401 Unauthorized error
 * 5. Verify error message indicates account is banned
 * 6. Verify no session created, no tokens returned
 *
 * Infrastructure Limitation:
 * There is no administrative API endpoint to ban sellers. Without this,
 * the complete banned seller login rejection cannot be tested.
 *
 * This test verifies:
 * - New sellers are created with banned=false (correct initial state)
 * - The banned property exists and is accessible in the response
 *
 * When admin banning endpoint becomes available, extend this test to:
 * - Ban the created seller
 * - Verify login returns HttpError with status 401
 * - Verify error message indicates banned status
 */
export async function test_api_seller_login_banned_account_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create a seller account that could potentially be banned by admin
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(seller);
  // Verify initial state - new sellers must NOT be banned
  // This is a prerequisite for banning workflow: accounts start unbanned
  TestValidator.equals(
    "new seller banned status should be false",
    seller.banned,
    false,
  );
  TestValidator.equals(
    "new seller suspended status should be false",
    seller.suspended,
    false,
  );
  // INFRASTRUCTURE LIMITATION:
  // Cannot test banned seller login rejection without admin API to ban sellers.
  //
  // Complete test flow (requires admin banning endpoint):
  // const bannedSeller = await adminApi.banSeller(adminConnection, {
  //   sellerId: seller.id,
  //   reason: "Policy violation"
  // });
  //
  // await TestValidator.httpError(
  //   "banned seller login should be rejected",
  //   401,
  //   async () => {
  //     const loginConnection: api.IConnection = { host: connection.host };
  //     await authorize_seller_login(loginConnection, {
  //       body: {
  //         email: seller.email,
  //         password: storedPassword,
  //         href: typia.random<string & tags.Format<"uri">>(),
  //         referrer: typia.random<string & tags.Format<"uri">>(),
  //       },
  //     });
  //   },
  // );
}
