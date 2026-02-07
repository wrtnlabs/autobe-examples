import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_index_with_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Index request with active filter
  const response = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        account_status: "active",
        page: 1,
        limit: 10,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate the response
  TestValidator.predicate(
    "has paginated customer data",
    response.data.length > 0,
  );
  TestValidator.predicate(
    "has pagination metadata",
    response.pagination.records > 0,
  );
  // 4. Verify each customer summary contains required fields
  for (const customer of response.data) {
    TestValidator.equals("customer has email", !!customer.email, true);
    TestValidator.equals("customer has ID", !!customer.id, true);
    TestValidator.equals(
      "customer has created_at",
      !!customer.created_at,
      true,
    );
  }
}
