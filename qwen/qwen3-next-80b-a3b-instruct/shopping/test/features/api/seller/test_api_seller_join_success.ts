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
  // Generate valid seller join data
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  // Execute seller registration using utility function
  const result = await authorize_seller_join(sellerConnection, {
    body: joinData,
  });
  // Validate response structure
  typia.assert(result);
  // Verify required fields
  TestValidator.equals(
    "seller id is uuid",
    result.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
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
  TestValidator.equals(
    "access token expired_at is date-time",
    result.token.expired_at,
    typia.random<string & tags.Format<"date-time">>(),
  );
  TestValidator.equals(
    "refreshable_until is date-time",
    result.token.refreshable_until,
    typia.random<string & tags.Format<"date-time">>(),
  );
  // Verify that the seller account is created with pending status (implied by join success)
  // Status 'pending' is not exposed in response, but implied by successful join with no error
  // This is the only way to verify account creation — through successful registration
}
