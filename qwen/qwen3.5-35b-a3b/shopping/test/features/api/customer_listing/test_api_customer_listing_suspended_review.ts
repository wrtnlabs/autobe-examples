import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
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

export async function test_api_customer_listing_suspended_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminResult);
  // 2. Create test customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerResult);
  // 3. Query suspended customers (should be empty initially)
  const suspendedResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "suspended",
      },
    });
  typia.assert(suspendedResponse);
  // 4. Query active customers (should include our test customer)
  const activeResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
      },
    });
  typia.assert(activeResponse);
  // 5. Verify our test customer appears in active results
  const foundCustomer = activeResponse.data.find(
    (c) => c.id === customerResult.id,
  );
  TestValidator.equals(
    "test customer found in active list",
    foundCustomer?.id,
    customerResult.id,
  );
  TestValidator.equals(
    "customer status is active",
    foundCustomer?.status,
    "active",
  );
  // 6. Query with includeDeleted=false (default)
  const withDeletedFalseResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        includeDeleted: false,
      },
    });
  typia.assert(withDeletedFalseResponse);
  // 7. Verify active customer count matches
  TestValidator.equals(
    "active count with includeDeleted=false",
    withDeletedFalseResponse.pagination.records,
    activeResponse.pagination.records,
  );
  // 8. Query with email partial matching
  const partialEmail = customerResult.email.split("@")[1] || "";
  const emailMatchResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: `@${partialEmail}`,
      },
    });
  typia.assert(emailMatchResponse);
  // 9. Verify email search found our customer
  const emailMatchCount = emailMatchResponse.data.filter(
    (c) => c.id === customerResult.id,
  ).length;
  TestValidator.equals(
    "email partial match found test customer",
    emailMatchCount,
    1,
  );
}