import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSessionStatus";
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
 * Test customer session status retrieval with valid authentication.
 *
 * Validates that an authenticated customer can successfully retrieve their session status information after registration and login. The test verifies the session status endpoint returns correct user identity type, session metadata, and appropriate null values for administrator-specific fields.
 *
 * This test ensures the primary success path for session status retrieval works correctly, including proper JWT token handling and session information extraction from the database.
 *
 * 1. Customer registers with valid credentials via authorize_customer_join.
 * 2. Customer connection is established with JWT token in Authorization header.
 * 3. Customer calls GET /ecommerce/customer/session-status endpoint.
 * 4. Validates response contains type='customer', valid user_id UUID, session id, created_at, expired_at timestamps.
 * 5. Validates grade field is null (customer, not administrator).
 */
export async function test_api_customer_session_status_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve session status
  const sessionStatus =
    await api.functional.ecommerce.customer.session_status.at(
      customerConnection,
    );
  typia.assert(sessionStatus);
  // 3. Validate business logic
  TestValidator.equals(
    "session type is customer",
    sessionStatus.type,
    "customer",
  );
  TestValidator.equals(
    "user_id matches customer id",
    sessionStatus.user_id,
    customerAuth.id,
  );
  TestValidator.predicate(
    "session id is valid uuid",
    typia.is<string & tags.Format<"uuid">>(sessionStatus.id),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(sessionStatus.created_at)),
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    !isNaN(Date.parse(sessionStatus.expired_at)),
  );
  TestValidator.equals("grade is null for customer", sessionStatus.grade, null);
}
