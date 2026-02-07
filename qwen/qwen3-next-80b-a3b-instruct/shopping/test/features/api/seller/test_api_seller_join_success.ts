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

export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Execute seller join using utility function (priority over SDK)
  // IShoppingMallSeller.IJoin is defined as an empty object {}
  // Therefore, we must pass an empty object
  const result = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // Validate response structure
  typia.assert(result);
  // Validate token structure
  typia.assert(result.token);
  // Validate token fields
  TestValidator.equals(
    "access token exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "access token is string",
    typeof result.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof result.token.refresh === "string",
  );
  // Validate expiration timestamps are ISO 8601 date-time format
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      result.token.refreshable_until,
    ),
  );
  // Validate expired_at is within reasonable range (30 minutes from now)
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const timeDiffMs = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    timeDiffMs >= 1700000 && timeDiffMs <= 1900000,
  ); // 28.5 to 31.5 minutes
  // Validate refreshable_until is within reasonable range (30 days from now)
  const refreshableUntil = new Date(result.token.refreshable_until);
  const refreshDiffMs = refreshableUntil.getTime() - now.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token expires in approximately 30 days",
    refreshDiffMs >= thirtyDaysMs * 0.95 &&
      refreshDiffMs <= thirtyDaysMs * 1.05,
  );
  // Ensure no secrets are returned in profile
  // Only token information should be returned
  // Confirm resolved type IAuthorized has no other properties
  TestValidator.equals(
    "authorized object has correct structure",
    Object.keys(result).length,
    1,
  );
  TestValidator.equals(
    "token property exists",
    Object.keys(result).includes("token"),
    true,
  );
}
