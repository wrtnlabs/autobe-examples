import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_admin_customer_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call GET /admin/admin/customers
  const result =
    await api.functional.ecommerceMall.admin.admin.customers.search(
      adminConnection,
    );
  typia.assert(result);
  // 3. Validate pagination metadata exists
  TestValidator.predicate("has pagination", result.pagination != null);
  TestValidator.predicate(
    "pagination current is valid",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    result.pagination.pages >= 0,
  );
  // 4. Validate each customer record structure
  for (const customer of result.data) {
    // Required fields validation
    TestValidator.predicate("has id", customer.id !== undefined);
    TestValidator.predicate("has email", customer.email !== undefined);
    TestValidator.predicate(
      "has created_at",
      customer.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      customer.updated_at !== undefined,
    );
    TestValidator.predicate("has status", customer.status !== undefined);
    // Status must be 'active' or 'banned'
    TestValidator.predicate(
      "status is active or banned",
      customer.status === "active" || customer.status === "banned",
    );
    // Nested profile validation
    TestValidator.predicate("has profile", customer.profile !== undefined);
    TestValidator.predicate(
      "profile has display_name",
      customer.profile.display_name !== undefined,
    );
    TestValidator.predicate(
      "profile has phone",
      customer.profile.phone !== undefined,
    );
    // 5. Security: password_hash must NOT be returned
    TestValidator.predicate(
      "password_hash is NOT returned",
      !("password_hash" in customer),
    );
  }
  // 6. Verify results are sorted by created_at descending
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevDate = new Date(result.data[i - 1].created_at).getTime();
      const currDate = new Date(result.data[i].created_at).getTime();
      TestValidator.predicate(
        "sorted by created_at descending",
        prevDate >= currDate,
      );
    }
  }
}
