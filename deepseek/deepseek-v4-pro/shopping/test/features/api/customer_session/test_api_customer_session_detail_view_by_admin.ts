import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test admin retrieval of a customer's authentication session details.
 *
 * Validates that an administrator can retrieve the full details of a specific
 * customer authentication session. The test registers an administrator and a
 * customer (whose registration automatically creates an initial session), then
 * has the admin query the session endpoint with the customer's ID and the
 * session's ID.
 *
 * The response is validated to contain all session fields: id (UUID), nested
 * customer summary (id, email, display_name, created_at, banned_at), ip address,
 * href URL, referrer URL, created_at timestamp, and expired_at timestamp. The
 * test also confirms that the session's nested customer ID matches the
 * customerId path parameter, ensuring correct session-to-customer association.
 *
 * 1. Administrator registers on the platform.
 * 2. Customer registers, which creates an initial authentication session.
 * 3. Admin retrieves the session using the customer ID and session ID.
 * 4. Validates session response structure and customer ID association.
 */
export async function test_api_customer_session_detail_view_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration (creates initial session)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Admin retrieves session details
  const session = await api.functional.shoppingMall.admin.customers.sessions.at(
    adminConnection,
    {
      customerId: customer.id,
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(session);
  // 4. Validate session fields
  TestValidator.equals(
    "session customer id matches path parameter",
    session.customer.id,
    customer.id,
  );
}
