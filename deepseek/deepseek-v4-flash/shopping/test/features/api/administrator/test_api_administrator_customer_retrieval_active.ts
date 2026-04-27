import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can retrieve an active (non-banned, non-deleted) customer account by its unique identifier.
 *
 * Validates the complete workflow for administrator customer retrieval: administrator registration and authentication, customer registration, and the admin-only GET customer endpoint. The response is validated for correct identity, email, profile data, timestamp formats, and null ban/deletion indicators.
 *
 * 1. Register and authenticate as an administrator via the administrator join endpoint.
 * 2. Register and authenticate as a customer via the customer join endpoint. Extract the customer UUID from the response.
 * 3. Administrator retrieves the customer account by its UUID.
 * 4. Validate the response: matching id, matching email, null banned_at (not banned), null deleted_at (active account).
 */
export async function test_api_administrator_customer_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin retrieves customer by ID
  const customer =
    await api.functional.eCommerceMall.administrator.customers.at(
      adminConnection,
      {
        customerId: customerAuth.id,
      },
    );
  typia.assert(customer);
  // 4. Validate business logic
  TestValidator.equals("customer id matches", customer.id, customerAuth.id);
  TestValidator.equals("email matches", customer.email, customerAuth.email);
  TestValidator.equals(
    "banned_at is null (not banned)",
    customer.banned_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (active account)",
    customer.deleted_at,
    null,
  );
}
