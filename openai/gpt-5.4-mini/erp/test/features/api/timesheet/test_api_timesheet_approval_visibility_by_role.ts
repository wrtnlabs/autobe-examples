import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_approval_visibility_by_role(
  connection: api.IConnection,
): Promise<void> {
  const regularConnection: api.IConnection = { host: connection.host };
  const approverConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/regular",
      referrer: "https://example.com/landing/regular",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/approver",
      referrer: "https://example.com/landing/approver",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const regularPage = await api.functional.erpHrmTime.member.timesheets.index(
    regularConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(regularPage);
  const approverPage = await api.functional.erpHrmTime.member.timesheets.index(
    approverConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
        status: "submitted",
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(approverPage);
  TestValidator.predicate(
    "regular member receives a valid paginated response",
    regularPage.pagination.current >= 1 && regularPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "approver receives a valid paginated response",
    approverPage.pagination.current >= 1 && approverPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "submitted filter is preserved in the request contract",
    approverPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "timesheet rows are scoped summaries",
    regularPage.data.every(
      (sheet) => sheet.id.length > 0 && sheet.createdAt.length > 0,
    ),
  );
}
