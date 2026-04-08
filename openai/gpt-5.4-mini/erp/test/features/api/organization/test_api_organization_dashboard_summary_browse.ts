import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_summary_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.erpHrmTime.member.organizations.dashboardSummaries.index(
      memberConnection,
      {
        organizationId,
        body: {} satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records are valid",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are valid",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "dashboard summaries are returned as a list",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "dashboard summary rows keep the summary projection",
    output.data.every(
      (row) =>
        typeof row.id === "string" &&
        typeof row.name === "string" &&
        typeof row.status === "string" &&
        typeof row.createdAt === "string" &&
        typeof row.updatedAt === "string",
    ),
  );
}
