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

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test successful seller login with valid registered email and password
  // 1. Seller sign up first (join) to have a valid account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "Test Shop",
      shopDescription: "A shop for testing purposes",
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinOutput);
  // 2. Login with the registered email and correct password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginOutput = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerJoinOutput.email,
        password: "password123",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginOutput);
  // Validate token fields to be valid strings and ISO 8601 datetime
  TestValidator.predicate(
    "access token is non-empty string",
    typeof sellerLoginOutput.token.access === "string" &&
      sellerLoginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof sellerLoginOutput.token.refresh === "string" &&
      sellerLoginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is valid ISO datetime",
    !isNaN(Date.parse(sellerLoginOutput.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO datetime",
    !isNaN(Date.parse(sellerLoginOutput.token.refreshable_until)),
  );
  // Validate basic seller info fields
  TestValidator.equals(
    "shop name matches",
    sellerLoginOutput.shopName,
    "Test Shop",
  );
  TestValidator.equals(
    "approval status is approved",
    sellerLoginOutput.approvalStatus,
    "approved",
  );
  // Validate session timestamps
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    !isNaN(Date.parse(sellerLoginOutput.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO datetime",
    !isNaN(Date.parse(sellerLoginOutput.updatedAt)),
  );
  // deletedAt can be null or undefined
  TestValidator.predicate(
    "deletedAt is null or valid ISO datetime",
    sellerLoginOutput.deletedAt === null ||
      sellerLoginOutput.deletedAt === undefined ||
      !isNaN(Date.parse(sellerLoginOutput.deletedAt ?? "")),
  );
  // Use the obtained access token in header for a basic authorized check
  const authorizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerLoginOutput.token.access}`,
    },
  };
  // No further secured resource call included since scenario focuses on login success
}
