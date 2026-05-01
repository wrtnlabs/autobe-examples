import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_logs_unfiltered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Query activity logs with a large limit to establish baseline data
  const basePage = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(basePage);
  // Validate baseline pagination metadata
  TestValidator.equals("base page current", basePage.pagination.current, 1);
  TestValidator.equals("base page limit", basePage.pagination.limit, 100);
  const totalRecords = basePage.pagination.records;
  const totalPages = basePage.pagination.pages;
  TestValidator.predicate("records non-negative", totalRecords >= 0);
  TestValidator.equals(
    "pages matches ceil(records/limit)",
    totalPages,
    Math.ceil(totalRecords / 100),
  );
  TestValidator.equals(
    "data length on first page",
    basePage.data.length,
    Math.min(totalRecords, 100),
  );
  // Validate reverse chronological order (newest first, created_at descending)
  if (basePage.data.length > 1) {
    for (let i = 1; i < basePage.data.length; i++) {
      const prev = basePage.data[i - 1]!;
      const curr = basePage.data[i]!;
      TestValidator.predicate(
        `chronological order at index ${i}`,
        prev.created_at >= curr.created_at,
      );
    }
  }
  // 3. Test pagination with varying limit when records exist
  if (totalRecords > 0) {
    const smallLimit = Math.min(5, totalRecords);
    const page1Small = await api.functional.erpHrm.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: smallLimit satisfies number as number,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
    typia.assert(page1Small);
    TestValidator.equals(
      "small limit current",
      page1Small.pagination.current,
      1,
    );
    TestValidator.equals(
      "small limit limit",
      page1Small.pagination.limit,
      smallLimit,
    );
    TestValidator.equals(
      "small limit records",
      page1Small.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "small limit pages",
      page1Small.pagination.pages,
      Math.ceil(totalRecords / smallLimit),
    );
    TestValidator.equals(
      "small limit data count",
      page1Small.data.length,
      Math.min(smallLimit, totalRecords),
    );
    // Verify small-limit page still has data sorted chronologically
    if (page1Small.data.length > 1) {
      for (let i = 1; i < page1Small.data.length; i++) {
        const prev = page1Small.data[i - 1]!;
        const curr = page1Small.data[i]!;
        TestValidator.predicate(
          `small limit chronological order at ${i}`,
          prev.created_at >= curr.created_at,
        );
      }
    }
    // Test page 2 when more than one page exists
    if (totalPages > 1) {
      const page2 = await api.functional.erpHrm.member.activity_logs.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: smallLimit satisfies number as number,
          } satisfies IErpHrmActivityLog.IRequest,
        },
      );
      typia.assert(page2);
      TestValidator.equals("page 2 current", page2.pagination.current, 2);
      TestValidator.equals("page 2 limit", page2.pagination.limit, smallLimit);
      TestValidator.equals(
        "page 2 records",
        page2.pagination.records,
        totalRecords,
      );
      TestValidator.equals(
        "page 2 pages",
        page2.pagination.pages,
        Math.ceil(totalRecords / smallLimit),
      );
      const expectedPage2Count = Math.min(
        smallLimit,
        Math.max(0, totalRecords - smallLimit),
      );
      TestValidator.equals(
        "page 2 data count",
        page2.data.length,
        expectedPage2Count,
      );
      // Ensure no overlap between page 1 and page 2 entries
      const page1Ids = new Set(page1Small.data.map((e) => e.id));
      for (const entry of page2.data) {
        TestValidator.predicate(
          "page 2 entries not in page 1",
          !page1Ids.has(entry.id),
        );
      }
      // Page 2 entries should be older than or equal to page 1 entries
      if (page1Small.data.length > 0 && page2.data.length > 0) {
        const lastPage1 = page1Small.data[page1Small.data.length - 1]!;
        const firstPage2 = page2.data[0]!;
        TestValidator.predicate(
          "page 2 entries older than page 1",
          lastPage1.created_at >= firstPage2.created_at,
        );
      }
    }
  }
  // 4. Test page beyond last available page — must return empty data, not an error
  const beyondPage = Math.max(1, totalPages + 1);
  const pageBeyond = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: beyondPage satisfies number as number,
        limit: 10,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals("beyond page data is empty", pageBeyond.data.length, 0);
  TestValidator.equals(
    "beyond page records unchanged",
    pageBeyond.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "beyond page pages unchanged",
    pageBeyond.pagination.pages,
    totalPages,
  );
  // 5. Zero-records edge case: if totalRecords is 0, verify graceful handling
  if (totalRecords === 0) {
    TestValidator.equals("zero records pages is zero", totalPages, 0);
    TestValidator.equals("zero records data is empty", basePage.data.length, 0);
    const page1Zero = await api.functional.erpHrm.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
    typia.assert(page1Zero);
    TestValidator.equals(
      "zero records page1 current",
      page1Zero.pagination.current,
      1,
    );
    TestValidator.equals(
      "zero records page1 records",
      page1Zero.pagination.records,
      0,
    );
    TestValidator.equals(
      "zero records page1 pages",
      page1Zero.pagination.pages,
      0,
    );
    TestValidator.equals(
      "zero records page1 data empty",
      page1Zero.data.length,
      0,
    );
  }
}
