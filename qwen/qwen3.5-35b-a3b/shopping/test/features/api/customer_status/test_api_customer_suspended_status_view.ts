import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_suspended_status_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Customer setup - join (will be retrieved by admin later)
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResultRaw = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResultRaw);
  // 3. Admin login (separate connection from join)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminJoinResult.token.access,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Admin retrieves customer details (customer has normal status, can be viewed by admin)
  const customerDetails = await api.functional.ecommerceMall.admin.customers.at(
    adminLoginConnection,
    {
      customerId: customerJoinResultRaw.id,
    },
  );
  typia.assert(customerDetails);
  // 5. Validate customer details are complete and accessible
  TestValidator.equals(
    "customer id matches",
    customerDetails.id,
    customerJoinResultRaw.id,
  );
  TestValidator.equals(
    "customer display_name matches",
    customerDetails.display_name,
    customerJoinResultRaw.display_name,
  );
  TestValidator.equals(
    "customer status matches",
    customerDetails.status,
    customerJoinResultRaw.status,
  );
  TestValidator.equals(
    "customer created_at matches",
    customerDetails.created_at,
    customerJoinResultRaw.created_at,
  );
  TestValidator.equals(
    "customer updated_at matches",
    customerDetails.updated_at,
    customerJoinResultRaw.updated_at,
  );
  TestValidator.equals(
    "customer deleted_at is null (not soft-deleted)",
    customerDetails.deleted_at,
    null,
  );
  // 6. Validate status field is present and string type
  TestValidator.predicate(
    "customer has status field",
    customerDetails.status !== undefined,
  );
  TestValidator.predicate(
    "status is string type",
    typeof customerDetails.status === "string",
  );
}
