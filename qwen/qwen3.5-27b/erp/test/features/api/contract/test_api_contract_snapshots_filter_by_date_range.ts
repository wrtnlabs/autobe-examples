import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

export async function test_api_contract_snapshots_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test contract snapshots filtering by date range.
   *
   * This test verifies that the PATCH /hrmPlatform/contracts/{contractId}/snapshots endpoint
   * correctly filters contract snapshots based on created_at date range parameters.
   * It tests various scenarios including full range, partial range, and empty range queries.
   */
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a contract (this will generate an initial snapshot)
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {},
  );
  typia.assert(contract);
  // Capture the snapshot creation time for date range testing
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 3. Test 1: Query with date range that should include the snapshot
  const resultWithSnapshots =
    await api.functional.hrmPlatform.contracts.snapshots.index(
      adminConnection,
      {
        contractId: contract.id,
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(resultWithSnapshots);
  TestValidator.predicate(
    "response contains pagination info",
    resultWithSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "response contains snapshot data array",
    Array.isArray(resultWithSnapshots.data),
  );
  // 4. Test 2: Query with date range in the future (should return empty)
  const resultEmptyFuture =
    await api.functional.hrmPlatform.contracts.snapshots.index(
      adminConnection,
      {
        contractId: contract.id,
        body: {
          created_at_start: tomorrow.toISOString(),
          created_at_end: new Date(
            tomorrow.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(resultEmptyFuture);
  TestValidator.equals(
    "future date range returns empty array",
    resultEmptyFuture.data.length,
    0,
  );
  TestValidator.equals(
    "future date range pagination records is 0",
    resultEmptyFuture.pagination.records,
    0,
  );
  // 5. Test 3: Query with date range in the distant past (should return empty)
  const resultEmptyPast =
    await api.functional.hrmPlatform.contracts.snapshots.index(
      adminConnection,
      {
        contractId: contract.id,
        body: {
          created_at_start: new Date(
            now.getTime() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date(
            now.getTime() - 364 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(resultEmptyPast);
  TestValidator.equals(
    "distant past date range returns empty array",
    resultEmptyPast.data.length,
    0,
  );
  // 6. Test 4: Query without date filters (should return all snapshots)
  const resultAll = await api.functional.hrmPlatform.contracts.snapshots.index(
    adminConnection,
    {
      contractId: contract.id,
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(resultAll);
  TestValidator.predicate(
    "unfiltered query returns at least one snapshot",
    resultAll.data.length >= 1,
  );
  TestValidator.equals(
    "unfiltered pagination records matches data length",
    resultAll.pagination.records,
    resultAll.data.length,
  );
  // 7. Test 5: Verify snapshot structure
  if (resultAll.data.length > 0) {
    const firstSnapshot = resultAll.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot has valid start_at",
      firstSnapshot.start_at !== null && firstSnapshot.start_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid pay_rate",
      typeof firstSnapshot.pay_rate === "number" && firstSnapshot.pay_rate > 0,
    );
    TestValidator.predicate(
      "snapshot has valid pay_period",
      ["hourly", "daily", "weekly", "monthly"].includes(
        firstSnapshot.pay_period,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid working_hours_per_week",
      typeof firstSnapshot.working_hours_per_week === "number" &&
        firstSnapshot.working_hours_per_week > 0,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      firstSnapshot.created_at !== null &&
        firstSnapshot.created_at !== undefined,
    );
  }
  // 8. Test 6: Pagination with limit
  const resultPaginated =
    await api.functional.hrmPlatform.contracts.snapshots.index(
      adminConnection,
      {
        contractId: contract.id,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(resultPaginated);
  TestValidator.equals(
    "pagination limit of 1 returns at most 1 item",
    resultPaginated.data.length,
    Math.min(1, resultAll.pagination.records),
  );
  TestValidator.equals(
    "pagination limit is respected",
    resultPaginated.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    resultPaginated.pagination.current,
    1,
  );
}
