import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Use empty object since IShoppingMallCustomer.IJoin is defined as {}
  const body = {} satisfies IShoppingMallCustomer.IJoin;
  // Execute customer join using utility function (highest priority)
  const result = await authorize_customer_join(customerConnection, { body });
  // Validate response structure using typia.assert (complete validation)
  typia.assert(result);
  // Validate token structure exists
  typia.assert(result.token);
  // Validate required token properties exist
  TestValidator.equals(
    "token property exists",
    result.hasOwnProperty("token"),
    true,
  );
  TestValidator.equals(
    "access token property exists",
    result.token.hasOwnProperty("access"),
    true,
  );
  TestValidator.equals(
    "refresh token property exists",
    result.token.hasOwnProperty("refresh"),
    true,
  );
  TestValidator.equals(
    "expired_at property exists",
    result.token.hasOwnProperty("expired_at"),
    true,
  );
  TestValidator.equals(
    "refreshable_until property exists",
    result.token.hasOwnProperty("refreshable_until"),
    true,
  );
}
