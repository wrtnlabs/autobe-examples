import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test default paginated customer listing for administrators.
 *
 * Validates that an authenticated administrator can retrieve a paginated list of all non-deleted customer accounts using default query parameters. The test confirms pagination metadata correctness, default sorting by newest registration first (created_at DESC), presence of all required fields in each summary record, and structural compliance via typia.assert.
 *
 * Soft-deleted customers are excluded by default per the include_deleted parameter defaulting to false. Password hashes are never present in ISummary responses — the DTO definition itself excludes this field.
 *
 * 1. Authenticate as an administrator using the join utility with randomized credentials.
 * 2. Request the customer listing with an empty body, triggering all query defaults.
 * 3. Validate pagination metadata: current=1, limit=20, records>=0, pages=ceil(records/limit).
 * 4. Verify descending sort by created_at across consecutive records.
 * 5. Confirm each summary entry has non-empty email and display_name fields.
 */
export async function test_api_customer_listing_paginated_default(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Request customer listing with default parameters (empty body)
  const result = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page should default to 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should default to 20",
    result.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages should equal ceil(records / limit)",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate sort order: created_at DESC (newest first)
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `customers sorted by created_at DESC at index ${i} → ${i + 1}`,
      new Date(result.data[i].created_at).getTime() >=
        new Date(result.data[i + 1].created_at).getTime(),
    );
  }
  // 5. Validate each summary record has required fields with values
  for (let i = 0; i < result.data.length; i++) {
    const customer = result.data[i];
    TestValidator.predicate(
      `customer[${i}] email should be non-empty`,
      customer.email.length > 0,
    );
    TestValidator.predicate(
      `customer[${i}] display_name should be non-empty`,
      customer.display_name.length > 0,
    );
  }
}
