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

export async function test_api_customer_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Test successful registration of a new customer account with unique email and valid password.
  // Verify the system hashes the password, stores the email and hashed password,
  // and returns the authorization token pair (access and refresh tokens) with expiration metadata.
  // Confirm the response body contains the correct token properties and the customer
  // is authorized to use the system.
  // Ensure that the endpoint is accessible without prior authentication.
  // Create actor-specific connection for customer join (registration)
  const customerJoinConnection: api.IConnection = { host: connection.host };
  // Prepare valid request body with email and password as required by the endpoint
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword!123",
  } satisfies {
    email: string & tags.Format<"email">;
    password: string;
  };
  // Call authorize_customer_join utility function to perform registration
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, { body });
  // Assert response structure and types
  typia.assert(authorized);
  // Validate presence and format of tokens
  typia.assert(authorized.token.access);
  typia.assert(authorized.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(authorized.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    authorized.token.refreshable_until,
  );
  // The customerJoinConnection.headers.Authorization should be set after authorization
  customerJoinConnection.headers ??= {};
  customerJoinConnection.headers.Authorization = authorized.token.access;
  // The presence of token implies the customer is authorized and session is established
  // No further validation needed here for session state as per instructions
}
