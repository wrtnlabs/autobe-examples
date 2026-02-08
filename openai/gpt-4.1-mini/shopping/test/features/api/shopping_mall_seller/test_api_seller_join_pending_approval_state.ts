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

export async function test_api_seller_join_pending_approval_state(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection object for seller join
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  // Use authorize_seller_join utility function to perform seller registration (join)
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    // Use an empty object for IShoppingMallSeller.IJoin as no specific fields listed
    body: {},
  });
  // Validate the structure and types of the authorized seller response
  typia.assert(authorizedSeller);
  // The token property should exist and contain the expected properties
  // We can check that tokens strings are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    typeof authorizedSeller.token.access === "string" &&
      authorizedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof authorizedSeller.token.refresh === "string" &&
      authorizedSeller.token.refresh.length > 0,
  );
  // The expired_at and refreshable_until should be valid ISO 8601 date-time strings
  // typia.assert already checked string & tags.Format<"date-time">, so you can rely on it
  // Here we can confirm that expired_at is a valid date and refreshable_until is a later date
  TestValidator.predicate(
    "token expired_at is a valid future date",
    !isNaN(Date.parse(authorizedSeller.token.expired_at)) &&
      new Date(authorizedSeller.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refreshable_until is a valid future date",
    !isNaN(Date.parse(authorizedSeller.token.refreshable_until)) &&
      new Date(authorizedSeller.token.refreshable_until) >
        new Date(authorizedSeller.token.expired_at),
  );
}
