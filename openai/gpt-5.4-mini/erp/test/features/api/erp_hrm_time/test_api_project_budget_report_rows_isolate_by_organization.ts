import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectBudgetReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_budget_report_rows_isolate_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seoul1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/a",
      referrer: "https://example.com/referrer/a",
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seoul1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/b",
      referrer: "https://example.com/referrer/b",
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberB);
  const organizationOneId = typia.random<string & tags.Format<"uuid">>();
  const organizationTwoId = typia.random<string & tags.Format<"uuid">>();
  const organizationOneResult =
    await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.index(
      memberAConnection,
      {
        organizationId: organizationOneId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest,
      },
    );
  typia.assert(organizationOneResult);
  const organizationTwoResult =
    await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.index(
      memberBConnection,
      {
        organizationId: organizationTwoId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest,
      },
    );
  typia.assert(organizationTwoResult);
  TestValidator.equals(
    "pagination current page should be requested page for organization one",
    organizationOneResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination current page should be requested page for organization two",
    organizationTwoResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be requested limit for organization one",
    organizationOneResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination limit should be requested limit for organization two",
    organizationTwoResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "organization one rows should belong to the selected organization",
    organizationOneResult.data.every(
      (row) => row.project.organization.id === organizationOneId,
    ),
  );
  TestValidator.predicate(
    "organization two rows should belong to the selected organization",
    organizationTwoResult.data.every(
      (row) => row.project.organization.id === organizationTwoId,
    ),
  );
  TestValidator.predicate(
    "organization one response should not contain organization two data",
    organizationOneResult.data.every(
      (row) => row.project.organization.id !== organizationTwoId,
    ),
  );
  TestValidator.predicate(
    "organization two response should not contain organization one data",
    organizationTwoResult.data.every(
      (row) => row.project.organization.id !== organizationOneId,
    ),
  );
}
