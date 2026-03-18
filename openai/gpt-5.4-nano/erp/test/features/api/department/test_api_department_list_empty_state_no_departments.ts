import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IAutoBePaginationSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IAutoBePaginationSearch";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_list_empty_state_no_departments(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & import("typia").tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "P@ssw0rd-1234",
      organizationName: `Org-${Date.now()}`,
      organizationDescription: `Empty-dept-org-${Date.now()}`,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" as string &
        import("typia").tags.Format<"uri">,
      referrer: "https://example.com/ref" as string &
        import("typia").tags.Format<"uri">,
      ip: "127.0.0.1" as string & import("typia").tags.Format<"ipv4">,
    },
  });
  const request = {
    page: 1,
    limit: 5,
  } satisfies IErpHrmTimeTrackingDepartment.IRequest;
  const page = await api.functional.erpHrmTimeTracking.member.departments.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals("departments list should be empty", page.data, []);
  TestValidator.equals(
    "pagination.records should be 0",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    page.pagination.pages,
    0,
  );
}
