import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_analytics_department_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test analytics with non-existent department_id (empty result)
  const emptyAnalytics = await api.functional.hrms.member.contracts.analytics(
    memberConnection,
    {
      body: {
        department_id: "00000000-0000-0000-0000-000000000000",
        page: 1,
        limit: 20,
      } satisfies IHrmsEmployeeContract.IRequest,
    },
  );
  typia.assert(emptyAnalytics);
  // 3. Validate empty analytics response
  TestValidator.equals(
    "empty analytics data array",
    emptyAnalytics.data.length,
    0,
  );
  TestValidator.equals(
    "empty analytics records count",
    emptyAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty analytics pages",
    emptyAnalytics.pagination.pages,
    0,
  );
  TestValidator.equals("current page", emptyAnalytics.pagination.current, 1);
  TestValidator.equals("limit", emptyAnalytics.pagination.limit, 20);
  // 4. Test analytics without department filter (global view)
  const globalAnalytics = await api.functional.hrms.member.contracts.analytics(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmsEmployeeContract.IRequest,
    },
  );
  typia.assert(globalAnalytics);
  // 5. Validate pagination structure
  TestValidator.equals(
    "global analytics pagination valid",
    globalAnalytics.pagination.current >= 1,
    true,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    globalAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    globalAnalytics.pagination.pages >= 0,
  );
  // 6. Validate analytics data structure if records exist
  if (globalAnalytics.data.length > 0) {
    typia.assert(globalAnalytics.data);
    const firstAnalytics = globalAnalytics.data[0];
    typia.assert(firstAnalytics);
    TestValidator.equals(
      "analytics has pay_period",
      ["hourly", "daily", "weekly", "monthly"].includes(
        firstAnalytics.pay_period,
      ),
      true,
    );
    TestValidator.predicate(
      "analytics pay_period valid",
      firstAnalytics.pay_period !== undefined,
    );
    TestValidator.predicate(
      "analytics contract_count non-negative",
      firstAnalytics.contract_count >= 0,
    );
    TestValidator.predicate(
      "analytics active_contract_count non-negative",
      firstAnalytics.active_contract_count >= 0,
    );
    TestValidator.predicate(
      "analytics has created_at",
      new Date(firstAnalytics.created_at).getTime() > 0,
    );
  }
  // 7. Test analytics with specific pay_period filter combined with department filter
  const filteredAnalytics =
    await api.functional.hrms.member.contracts.analytics(memberConnection, {
      body: {
        department_id: "00000000-0000-0000-0000-000000000000",
        pay_period: "monthly",
        page: 1,
        limit: 20,
      } satisfies IHrmsEmployeeContract.IRequest,
    });
  typia.assert(filteredAnalytics);
  // 8. Validate filtered analytics also returns empty for non-existent department
  TestValidator.equals(
    "filtered analytics data array",
    filteredAnalytics.data.length,
    0,
  );
  TestValidator.equals(
    "filtered analytics records",
    filteredAnalytics.pagination.records,
    0,
  );
}
