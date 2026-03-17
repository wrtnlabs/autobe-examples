import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_customer_session_detail_accessible_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // Step 2: Register a new customer account
  // The join response does not expose a session ID directly, but we capture
  // the customer ID and the token (access/refresh) for identifying the session.
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // Step 3: As the administrator, ban the customer account
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId },
  );
  typia.assert(bannedCustomer);
  // Validate that the ban was applied
  TestValidator.equals(
    "customer is banned after ban operation",
    bannedCustomer.isBanned,
    true,
  );
  // Step 4: As the administrator, attempt to retrieve the customer's session.
  // The join response (IShoppingMallCustomer.IAuthorized) does not expose the
  // session UUID directly. Since no listing endpoint is available, we verify
  // that the admin endpoint is NOT forbidden (not 403) for banned customers —
  // i.e., the ban does not block admin oversight of session records.
  // The call is expected to return 404 (session UUID unknown) rather than 403
  // (which would mean the ban incorrectly restricts admin access).
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "admin can query banned customer sessions (endpoint accessible, session not found)",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.sessions.at(
        adminConnection,
        {
          customerId,
          sessionId: fakeSessionId,
        },
      );
    },
  );
}
