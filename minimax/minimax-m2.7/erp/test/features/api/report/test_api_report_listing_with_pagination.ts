import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_report_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Set organization context
  const orgContextConnection: api.IConnection = { host: connection.host };
  await generate_random_erp_hrm_member_organization_context_select(
    orgContextConnection,
    {},
  );
  // 3. Call reports endpoint with pagination parameters
  const response = await api.functional.erpHrm.member.reports.index(
    orgContextConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 5. Validate each report has required fields
  for (const report of response.data) {
    TestValidator.predicate(
      "report has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.id,
      ),
    );
    TestValidator.predicate(
      "report has valid reportType",
      [
        "time_report",
        "project_budget_report",
        "weekly_summary_report",
      ].includes(report.reportType),
    );
    TestValidator.predicate(
      "report has valid createdAt",
      !isNaN(Date.parse(report.createdAt)),
    );
    TestValidator.predicate(
      "report has organization",
      report.organization !== null,
    );
    TestValidator.predicate(
      "organization has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.organization.id,
      ),
    );
    TestValidator.predicate(
      "report has generatedByMember",
      report.generatedByMember !== null,
    );
    TestValidator.predicate(
      "member has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.generatedByMember.id,
      ),
    );
  }
  // 6. Validate ordering by createdAt descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `report ${i} createdAt >= report ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
}
