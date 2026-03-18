import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_definitions_index_no_cross_organization_leakage(
  connection: api.IConnection,
): Promise<void> {
  // Actor A: create a member (creates an organization context automatically)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    organizationName: `${RandomGenerator.alphabets(8)} A`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join-a",
    referrer: "https://example.com/ref-a",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberAConnection, {
    body: memberAJoinBody,
  });

  // Actor B: create a separate member (assumed separate organization/tenant)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    organizationName: `${RandomGenerator.alphabets(8)} B`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 2 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join-b",
    referrer: "https://example.com/ref-b",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberBConnection, {
    body: memberBJoinBody,
  });

  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeTrackingReportDefinition.IRequest;

  const pageA = await api.functional.erpHrmTimeTracking.reportDefinitions.index(
    memberAConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(pageA);

  const pageB = await api.functional.erpHrmTimeTracking.reportDefinitions.index(
    memberBConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(pageB);

  type SummaryWithId = { id: unknown };
  type SummaryWithOrganizationId = {
    organization: { id: unknown };
  };

  const idsA = pageA.data.map((x) => (x as unknown as SummaryWithId).id);
  const idsB = pageB.data.map((x) => (x as unknown as SummaryWithId).id);

  if (pageA.data.length > 0) {
    const orgIdA = (pageA.data[0] as unknown as SummaryWithOrganizationId)
      .organization.id;
    TestValidator.predicate(
      "org A should have consistent organization.id on items",
      () =>
        pageA.data.every(
          (x) =>
            (x as unknown as SummaryWithOrganizationId).organization.id ===
            orgIdA,
        ),
    );
  }
  if (pageB.data.length > 0) {
    const orgIdB = (pageB.data[0] as unknown as SummaryWithOrganizationId)
      .organization.id;
    TestValidator.predicate(
      "org B should have consistent organization.id on items",
      () =>
        pageB.data.every(
          (x) =>
            (x as unknown as SummaryWithOrganizationId).organization.id ===
            orgIdB,
        ),
    );
  }

  if (pageA.data.length > 0 && pageB.data.length > 0) {
    const leaked = idsB.filter((id) => idsA.includes(id));
    TestValidator.equals("should not leak report definition ids", leaked, []);
  }

  if (pageA.data.length === 0) {
    TestValidator.equals("org A pagination records", pageA.pagination.records, 0);
    TestValidator.equals("org A pagination pages", pageA.pagination.pages, 0);
  }
  if (pageB.data.length === 0) {
    TestValidator.equals("org B pagination records", pageB.pagination.records, 0);
    TestValidator.equals("org B pagination pages", pageB.pagination.pages, 0);
  }
}
