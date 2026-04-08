import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_own_timesheets_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. List own timesheets with pagination (empty - new member has no timesheets)
  const result = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // 3. Validate response contains pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    result.pagination !== undefined,
    true,
  );
  // 4. Validate timesheet summary structure (if any data exists, fields should be correct)
  for (const timesheet of result.data) {
    TestValidator.equals("has id", timesheet.id !== undefined, true);
    TestValidator.equals(
      "has weekStartDate",
      timesheet.weekStartDate !== undefined,
      true,
    );
    TestValidator.equals(
      "has weekEndDate",
      timesheet.weekEndDate !== undefined,
      true,
    );
    TestValidator.equals("has status", timesheet.status !== undefined, true);
    TestValidator.equals(
      "has totalHours",
      timesheet.totalHours !== undefined,
      true,
    );
    TestValidator.equals(
      "has employee info",
      timesheet.employee !== undefined,
      true,
    );
  }
  // 5. Validate pagination metadata is correct
  TestValidator.predicate(
    "records is 0 for new member",
    result.pagination.records === 0,
  );
  TestValidator.predicate(
    "data is empty for new member",
    result.data.length === 0,
  );
  // 6. Validate pagination properties are non-negative
  TestValidator.predicate(
    "current page is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
}
