import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new customer account via join operation
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 2: Use customer ID as session ID for session retrieval (simplification based on scenario constraints)
  const sessionId: string = customer.id;
  // Step 3: Retrieve session details using the session ID
  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.sessions.at(connection, {
      sessionId,
    });
  typia.assert(session);
  // Step 4: Validate session ID matches expected value
  TestValidator.equals(
    "session ID should match expected",
    session.id,
    sessionId,
  );
  // Step 5: Validate user ID in session matches customer ID
  TestValidator.equals(
    "user ID should match customer ID",
    session.user.id,
    customer.id,
  );
  // Step 6: Validate expiration timestamp matches token's refreshable until
  TestValidator.equals(
    "expiration timestamp should match token data",
    session.expiresAt,
    customer.token.refreshable_until,
  );
}
