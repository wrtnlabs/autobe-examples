import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test seller login when the account has pending administrator approval status.
 *
 * This test verifies that:
 * 1. A seller can successfully register (creates account with PENDING status)
 * 2. A seller with PENDING approval status can login successfully
 * 3. Login returns valid authentication tokens despite pending approval
 * 4. The approval_status field correctly shows 'PENDING' in the response
 *
 * This validates that pending sellers can access the platform to monitor
 * their application status while being restricted from selling activities.
 */
export async function test_api_seller_login_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with random credentials (automatically has PENDING approval status)
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinResult = await authorize_seller_join(connection, {
    body: {
      email: email,
      password: password,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Verify the joined seller has PENDING status
  TestValidator.equals(
    "initial approval status",
    joinResult.approval_status,
    "PENDING",
  );
  // 3. Create a new connection for login test (connection isolation pattern)
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Login with the seller credentials
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  // 5. Verify login succeeded with PENDING status
  TestValidator.equals("seller ID matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.equals(
    "approval status remains PENDING",
    loginResult.approval_status,
    "PENDING",
  );
  // 6. Verify authentication tokens are present and valid
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    loginResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    loginResult.token.refreshable_until !== undefined,
  );
}
