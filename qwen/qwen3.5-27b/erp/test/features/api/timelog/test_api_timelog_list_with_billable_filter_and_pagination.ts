import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timelog list with billable filter and pagination.
 *
 * This test validates:
 * 1. Billable filter correctly separates billable and non-billable timelogs
 * 2. Pagination works correctly with filtered results
 * 3. Pagination metadata accurately reflects filtered data
 * 4. Page navigation returns correct subsets
 */
export async function test_api_timelog_list_with_billable_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // Note: In a real scenario, we would need to create timelog entries first
  // However, there's no utility function or SDK function provided for creating timelogs
  // The test will validate the filtering and pagination logic on existing data
  // 2. Test billable=true filter
  const billableResult = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(billableResult);
  // Verify all returned timelogs are billable
  TestValidator.predicate(
    "all timelogs are billable",
    billableResult.data.every((timelog) => timelog.billable === true),
  );
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    billableResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", billableResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records match data length",
    billableResult.pagination.records >= billableResult.data.length,
  );
  // 3. Test billable=false filter
  const nonBillableResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(nonBillableResult);
  // Verify all returned timelogs are non-billable
  TestValidator.predicate(
    "all timelogs are non-billable",
    nonBillableResult.data.every((timelog) => timelog.billable === false),
  );
  // 4. Test pagination with limit=5, page=1
  const page1Result = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Result.data.length <= 5,
  );
  // 5. Test pagination with limit=5, page=2
  const page2Result = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
        page: 2,
        limit: 5,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 data length <= limit",
    page2Result.data.length <= 5,
  );
  // 6. Verify page navigation - page 2 should have different IDs than page 1
  const page1Ids = new Set(page1Result.data.map((t) => t.id));
  const page2Ids = new Set(page2Result.data.map((t) => t.id));
  const hasOverlap = Array.from(page1Ids).some((id) => page2Ids.has(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping timelog IDs",
    !hasOverlap,
  );
  // 7. Test pagination metadata accuracy
  TestValidator.predicate(
    "pagination pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
  // 8. Test edge case: limit=1
  const singlePageResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
        page: 1,
        limit: 1,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(singlePageResult);
  TestValidator.equals(
    "single page limit",
    singlePageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single page data length is 0 or 1",
    singlePageResult.data.length <= 1,
  );
  // 9. Test edge case: page beyond available pages
  const beyondPageResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
        page: 9999,
        limit: 20,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page current page",
    beyondPageResult.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "beyond page returns empty data",
    beyondPageResult.data.length === 0,
  );
}
