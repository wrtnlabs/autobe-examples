import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Create isolated connection for customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate valid email and secure password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Execute customer registration using utility function
  const response = await authorize_customer_join(customerConnection, {
    body: { email, password } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Validate complete response structure
  typia.assert(response);
  // Verify email matches input
  TestValidator.equals("email matches input", response.email, email);
  // Verify profile fields are initially null
  TestValidator.equals(
    "profile displayName is null initially",
    response.profile.displayName,
    null,
  );
  TestValidator.equals(
    "profile phoneNumber is null initially",
    response.profile.phoneNumber,
    null,
  );
  // Verify connection has been authorized with access token for immediate use
  TestValidator.equals(
    "connection authorization header set to access token",
    customerConnection.headers?.Authorization,
    response.token.access,
  );
}
