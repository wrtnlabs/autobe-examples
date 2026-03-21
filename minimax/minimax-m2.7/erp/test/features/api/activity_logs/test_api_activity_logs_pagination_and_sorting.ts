import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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

export async function test_api_activity_logs_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access activity logs endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  // Use a valid organization ID for testing
  // In production, this would come from existing organization data
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Query first page of activity logs with pagination (page=1, limit=10)
  const page1: IPageIErpHrmActivityLog.ISummary =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata for page 1
  TestValidator.equals("current page should be 1", page1.pagination.current, 1);
  TestValidator.equals("limit should be 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "total pages should be non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    page1.pagination.records >= 0,
  );
  const totalPages = page1.pagination.pages;
  const totalRecords = page1.pagination.records;
  // 3. Query second page if there are enough records
  if (totalPages >= 2) {
    const page2: IPageIErpHrmActivityLog.ISummary =
      await api.functional.erpHrm.member.organizations.activity_logs.index(
        memberConnection,
        {
          organizationId,
          body: {
            page: 2,
            limit: 10,
          } satisfies IErpHrmActivityLog.IRequest,
        },
      );
    typia.assert(page2);
    // Validate page 2 metadata
    TestValidator.equals(
      "page 2 current should be 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should be 10",
      page2.pagination.limit,
      10,
    );
    TestValidator.equals(
      "total pages should match",
      page2.pagination.pages,
      totalPages,
    );
    TestValidator.equals(
      "total records should match",
      page2.pagination.records,
      totalRecords,
    );
    // Verify page 2 returns different records from page 1
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1Ids = page1.data.map((log) => log.id);
      const page2Ids = page2.data.map((log) => log.id);
      TestValidator.notEquals(
        "page 1 and page 2 should have different record IDs",
        page1Ids,
        page2Ids,
      );
    }
  }
  // 4. Test sorting by action_type with ascending order
  const sortedPage: IPageIErpHrmActivityLog.ISummary =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 20,
          orderBy: "action_type",
          sortOrder: "asc",
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(sortedPage);
  // Validate sorted results are in alphabetical order by action_type
  if (sortedPage.data.length > 1) {
    for (let i = 0; i < sortedPage.data.length - 1; i++) {
      const current = sortedPage.data[i].action_type;
      const next = sortedPage.data[i + 1].action_type;
      TestValidator.predicate(
        `action_type at index ${i} should be <= action_type at index ${i + 1}`,
        current.localeCompare(next) <= 0,
      );
    }
  }
  // 5. Validate each activity log summary contains properly formatted data
  for (const log of sortedPage.data) {
    typia.assert(log);
    TestValidator.predicate(
      "activity log should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.id,
      ),
    );
    TestValidator.predicate(
      "action_type should not be empty",
      log.action_type.length > 0,
    );
    TestValidator.predicate(
      "target_entity_type should not be empty",
      log.target_entity_type.length > 0,
    );
    TestValidator.predicate(
      "member should exist",
      log.member !== null && log.member !== undefined,
    );
    TestValidator.predicate(
      "created_at should be valid ISO date-time",
      !isNaN(Date.parse(log.created_at)),
    );
  }
}
