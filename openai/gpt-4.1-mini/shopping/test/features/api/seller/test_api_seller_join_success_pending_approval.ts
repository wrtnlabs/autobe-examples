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

export async function test_api_seller_join_success_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  // Prepare valid seller join data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!", // Plain text password
    shopName: RandomGenerator.name(2),
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoUri: `https://example.com/logo_${RandomGenerator.alphabets(5)}.png`,
  } satisfies IShoppingMallSeller.IJoin;
  // Call the authorize_seller_join utility to register seller
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(sellerAuthorized);
  // Validate returned fields
  TestValidator.predicate(
    "approval status is pending",
    sellerAuthorized.approvalStatus === "pending",
  );
  TestValidator.equals(
    "email matches input",
    sellerAuthorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "shop name matches input",
    sellerAuthorized.shopName,
    joinBody.shopName,
  );
  TestValidator.equals(
    "shop description matches input",
    sellerAuthorized.shopDescription ?? null,
    joinBody.shopDescription ?? null,
  );
  TestValidator.equals(
    "logo URI matches input",
    sellerAuthorized.logoUri ?? null,
    joinBody.logoUri ?? null,
  );
  // The token should have valid access and refresh fields
  const token = sellerAuthorized.token;
  TestValidator.predicate(
    "token access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO date-time",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  // Attempt to log in with the same credentials should fail because status is pending
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "cannot log in while pending approval",
    async () => {
      await authorize_seller_login(loginConnection, {
        body: { email: joinBody.email, password: joinBody.password },
      });
    },
  );
}
