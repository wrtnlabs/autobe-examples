import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated super admin for listing operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: `main.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Create test super admin data with predictable emails for filtering
  const testConn1: api.IConnection = { host: connection.host };
  const testAdmin1 = await authorize_super_admin_join(testConn1, {
    body: {
      email: `alpha.filter.${RandomGenerator.alphaNumeric(4)}@ecommerce.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const testConn2: api.IConnection = { host: connection.host };
  const testAdmin2 = await authorize_super_admin_join(testConn2, {
    body: {
      email: `beta.filter.${RandomGenerator.alphaNumeric(4)}@ecommerce.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const testConn3: api.IConnection = { host: connection.host };
  const testAdmin3 = await authorize_super_admin_join(testConn3, {
    body: {
      email: `gamma.other.${RandomGenerator.alphaNumeric(4)}@ecommerce.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 3: Test email partial match filter (minimum 3 characters: "filter")
  const emailFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          email: "filter",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  const emailFilteredEmails = emailFilterResult.data.map((a) => a.email);
  TestValidator.predicate(
    "email partial match should include testAdmin1 and testAdmin2 with 'filter' in email",
    () =>
      emailFilteredEmails.includes(testAdmin1.email) &&
      emailFilteredEmails.includes(testAdmin2.email),
  );
  TestValidator.predicate(
    "email partial match should exclude testAdmin3 without 'filter' in email",
    () => !emailFilterResult.data.some((a) => a.email === testAdmin3.email),
  );
  // Step 4: Test date range filter (inclusive boundaries)
  const dateRangeStart = new Date();
  dateRangeStart.setDate(dateRangeStart.getDate() - 1);
  const dateRangeEnd = new Date();
  dateRangeEnd.setDate(dateRangeEnd.getDate() + 1);
  const dateFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          createdAtFrom: dateRangeStart.toISOString(),
          createdAtTo: dateRangeEnd.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  const dateFilteredIds = dateFilterResult.data.map((a) => a.id);
  TestValidator.predicate(
    "date range filter should include recently created test admins",
    () =>
      dateFilteredIds.includes(testAdmin1.id) &&
      dateFilteredIds.includes(testAdmin2.id) &&
      dateFilteredIds.includes(testAdmin3.id),
  );
  // Step 5: Verify date range inclusivity (exact timestamp match)
  const inclusiveDateResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          createdAtFrom: testAdmin1.createdAt,
          createdAtTo: testAdmin1.createdAt,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(inclusiveDateResult);
  TestValidator.predicate(
    "date range is inclusive - exact createdAt timestamp should return the record",
    () => inclusiveDateResult.data.some((a) => a.id === testAdmin1.id),
  );
  // Step 6: Test combined filters (email AND date range)
  const combinedFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          email: "alpha.filter",
          createdAtFrom: dateRangeStart.toISOString(),
          createdAtTo: dateRangeEnd.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters should return only testAdmin1 matching both email and date criteria",
    () =>
      combinedFilterResult.data.length === 1 &&
      combinedFilterResult.data[0].id === testAdmin1.id,
  );
  // Step 7: Test empty results edge case (no matching email)
  const emptyResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          email: "xyznonexistent999",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result data array length",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result pagination limit",
    emptyResult.pagination.limit,
    20,
  );
  // Step 8: Test empty results edge case (date range in future)
  const emptyDateResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          createdAtFrom: new Date("2030-01-01T00:00:00.000Z").toISOString(),
          createdAtTo: new Date("2030-12-31T23:59:59.000Z").toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(emptyDateResult);
  TestValidator.equals(
    "future date range result data array length",
    emptyDateResult.data.length,
    0,
  );
  TestValidator.equals(
    "future date range result pagination records",
    emptyDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range result pagination pages",
    emptyDateResult.pagination.pages,
    0,
  );
}
