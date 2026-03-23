import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeRoleChange";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployeeRoleChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_change_audit_record_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for authorization
  const memberConnection: api.IConnection = { host: connection.host };
  // Join as member to authenticate
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // Test pagination with different page numbers and limits
  // Test first page with limit 5
  const page1 = await api.functional.hrmTracker.member.audit.role_changes.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination structure for page 1
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", page1.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records count is valid",
    page1.pagination.records >= 0,
  );
  if (page1.pagination.records === 0) {
    TestValidator.equals(
      "pagination pages when no records",
      page1.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "pagination pages count is valid",
      page1.pagination.pages >= 1,
    );
  }
  TestValidator.predicate(
    "data array length matches limit or less",
    page1.data.length <= 5,
  );
  // Test second page with limit 5
  const page2 = await api.functional.hrmTracker.member.audit.role_changes.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
    },
  );
  typia.assert(page2);
  // Validate pagination structure for page 2
  TestValidator.equals(
    "pagination current page is 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit is 5", page2.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records count matches page 1",
    page2.pagination.records === page1.pagination.records,
  );
  if (page1.pagination.records > 0) {
    TestValidator.equals(
      "pagination pages count matches page 1",
      page2.pagination.pages,
      page1.pagination.pages,
    );
  }
  TestValidator.predicate(
    "data array length matches limit or less",
    page2.data.length <= 5,
  );
  // Test with default pagination (no page/limit specified)
  const defaultPage =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      memberConnection,
      {
        body: {} satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate default pagination behavior
  TestValidator.predicate(
    "default page has valid current page",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default page has valid limit",
    defaultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "default page has non-negative records",
    defaultPage.pagination.records >= 0,
  );
  if (defaultPage.pagination.records === 0) {
    TestValidator.equals(
      "default page pages when no records",
      defaultPage.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "default page has valid pages",
      defaultPage.pagination.pages >= 1,
    );
  }
  TestValidator.predicate(
    "default data array exists",
    Array.isArray(defaultPage.data),
  );
  // Test edge case: page with limit 1
  const page1_limit1 =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(page1_limit1);
  // Validate pagination structure with limit 1
  TestValidator.equals(
    "pagination current page is 1",
    page1_limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    page1_limit1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination records count matches previous",
    page1_limit1.pagination.records,
    page1.pagination.records,
  );
  if (page1_limit1.pagination.records === 0) {
    TestValidator.equals(
      "pagination pages when no records",
      page1_limit1.pagination.pages,
      0,
    );
  } else {
    TestValidator.equals(
      "pagination pages count calculated correctly",
      page1_limit1.pagination.pages,
      Math.ceil(page1_limit1.pagination.records / 1),
    );
  }
  TestValidator.equals("data array length", page1_limit1.data.length, 1);
  // Test edge case: page with limit exceeding total records
  const page1_largeLimit =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1000,
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(page1_largeLimit);
  // Validate large limit behavior
  TestValidator.equals(
    "pagination current page is 1",
    page1_largeLimit.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1000",
    page1_largeLimit.pagination.limit,
    1000,
  );
  TestValidator.equals(
    "pagination records count matches",
    page1_largeLimit.pagination.records,
    page1.pagination.records,
  );
  if (page1_largeLimit.pagination.records === 0) {
    TestValidator.equals(
      "pagination pages when no records",
      page1_largeLimit.pagination.pages,
      0,
    );
  } else {
    TestValidator.equals(
      "pagination pages calculated correctly",
      page1_largeLimit.pagination.pages,
      Math.ceil(page1_largeLimit.pagination.records / 1000),
    );
  }
  TestValidator.predicate(
    "data array length <= limit",
    page1_largeLimit.data.length <= 1000,
  );
  // Test edge case: page number 0 (if supported) or validate invalid handling
  const page0 = await api.functional.hrmTracker.member.audit.role_changes.index(
    memberConnection,
    {
      body: {
        page: 0,
        limit: 5,
      } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
    },
  );
  typia.assert(page0);
  // Validate page 0 behavior (may be treated as page 1 by server)
  TestValidator.predicate(
    "page 0 has valid pagination",
    page0.pagination.current >= 0 && page0.pagination.limit === 5,
  );
  // Validate that each record in the response has expected structure
  for (const record of page1.data) {
    typia.assert<IHrmTrackerEmployeeRoleChange.ISummary>(record);
    TestValidator.predicate(
      "record has valid employee id",
      typeof record.employee.id === "string",
    );
    TestValidator.predicate(
      "record has valid actor id",
      typeof record.actor.id === "string",
    );
    TestValidator.predicate(
      "record has valid action type",
      typeof record.action_type === "string",
    );
    TestValidator.predicate(
      "record has valid changed_at timestamp",
      typeof record.changed_at === "string",
    );
  }
}
