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

/**
 * Test administrator customer list retrieval with basic pagination.
 * 1. Register and authenticate as administrator
 * 2. Retrieve customer list with default pagination
 * 3. Verify response structure includes customer summaries
 * 4. Verify pagination metadata is correct
 * 5. Verify sensitive information is excluded
 */
export async function test_api_admin_customer_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve customer list with default pagination
  const customerList = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(customerList);
  // 3. Verify response structure includes customer summaries
  TestValidator.predicate(
    "response has pagination",
    customerList.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(customerList.data),
  );
  // 4. Verify pagination metadata is correct
  TestValidator.predicate(
    "current page is non-negative",
    customerList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    customerList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    customerList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    customerList.pagination.pages >= 0,
  );
  // Verify pagination consistency
  if (customerList.pagination.limit > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      customerList.pagination.pages ===
        Math.ceil(
          customerList.pagination.records / customerList.pagination.limit,
        ),
    );
  }
  // 5. Verify customer data structure (if any customers exist)
  if (customerList.data.length > 0) {
    const firstCustomer = customerList.data[0];
    typia.assert(firstCustomer);
    // Verify no sensitive information (password hash should not exist)
    TestValidator.predicate(
      "no password_hash field",
      !("password_hash" in firstCustomer),
    );
    // Verify deleted_at is not present in summary (soft-deleted customers excluded)
    TestValidator.predicate(
      "no deleted_at field",
      !("deleted_at" in firstCustomer),
    );
  }
}