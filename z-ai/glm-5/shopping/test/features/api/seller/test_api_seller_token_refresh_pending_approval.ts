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

export async function test_api_seller_token_refresh_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // Setup Step 1: Create seller account with pending approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  // Store initial tokens for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // Test Execution Step 1: Refresh token using utility function
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: initialRefreshToken,
    },
  });
  typia.assert(refreshedAuth);
  // Validation Point 1: New access token is different from initial
  TestValidator.notEquals(
    "access token changed",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  // Validation Point 2: Seller profile data matches
  TestValidator.equals("seller id matches", initialAuth.id, refreshedAuth.id);
  TestValidator.equals("email matches", initialAuth.email, refreshedAuth.email);
  TestValidator.equals(
    "shop name matches",
    initialAuth.shopName,
    refreshedAuth.shopName,
  );
  // Validation Point 3: Approval status remains pending
  TestValidator.equals(
    "approval status is pending",
    "pending",
    refreshedAuth.approval_status,
  );
  TestValidator.equals("not suspended", false, refreshedAuth.suspended);
  TestValidator.equals("not banned", false, refreshedAuth.banned);
  // Validation Point 4: Token expiration timestamps are valid
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  // expired_at should be in the future
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  // refreshable_until should be further in the future than expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // Validation Point 5: Token fields are populated
  TestValidator.predicate(
    "access token is not empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    refreshedAuth.token.refresh.length > 0,
  );
}
