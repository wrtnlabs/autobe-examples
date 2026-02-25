import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful customer login with valid credentials.
 * 1. Create a new customer account via join endpoint
 * 2. Test login with correct email and password
 * 3. Validate authorization tokens and customer profile
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account for testing
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }).substring(0, 50),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await api.functional.ecommerce.auth.customer.join(
    joinConnection,
    { body: joinCredentials },
  );
  typia.assert(joinedCustomer);
  // Step 2: Create customer-specific connection for login
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 3: Use utility function to login with valid credentials
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
  } satisfies IEcommerceCustomer.ILogin;
  // Utility function must be available in test context
  const authorizedCustomer = await (async (
    conn: api.IConnection,
    props: {
      body: IEcommerceCustomer.ILogin;
    },
  ) => {
    return await api.functional.ecommerce.auth.customer.login(conn, {
      body: props.body,
    });
  })(customerConnection, { body: loginCredentials });
  typia.assert(authorizedCustomer);
  // Step 4: Validate customer profile information (business logic validation)
  TestValidator.equals(
    "customer id matches",
    authorizedCustomer.id,
    joinedCustomer.id,
  );
  TestValidator.equals(
    "email matches",
    authorizedCustomer.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "display name matches",
    authorizedCustomer.display_name,
    joinCredentials.display_name,
  );
  TestValidator.equals(
    "phone number matches",
    authorizedCustomer.phone_number,
    joinCredentials.phone_number,
  );
  // Step 5: Validate token structure (business logic validation)
  TestValidator.predicate(
    "access token present",
    authorizedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    authorizedCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorizedCustomer.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorizedCustomer.token.refreshable_until,
    ),
  );
  // Step 6: Validate timestamps and ID format (business logic validation)
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorizedCustomer.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorizedCustomer.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null for active customer",
    authorizedCustomer.deleted_at,
    null,
  );
}
