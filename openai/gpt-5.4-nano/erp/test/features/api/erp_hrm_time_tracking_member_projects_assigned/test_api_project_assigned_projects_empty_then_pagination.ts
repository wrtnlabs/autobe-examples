import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_assigned_projects_empty_then_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!2345" satisfies string,
    organizationName: RandomGenerator.alphabets(12),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 3 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const requestBase =
    typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>();
  const requestPage1Limit1: IErpHrmTimeTrackingProjectMembership.IRequest =
    (() => {
      const cloned: Record<string, unknown> = {
        ...(requestBase as unknown as Record<string, unknown>),
      };
      cloned["page"] = 1;
      cloned["limit"] = 1;
      return cloned as unknown as IErpHrmTimeTrackingProjectMembership.IRequest;
    })();
  const requestPage2Limit1: IErpHrmTimeTrackingProjectMembership.IRequest =
    (() => {
      const cloned: Record<string, unknown> = {
        ...(requestBase as unknown as Record<string, unknown>),
      };
      cloned["page"] = 2;
      cloned["limit"] = 1;
      return cloned as unknown as IErpHrmTimeTrackingProjectMembership.IRequest;
    })();
  const assignedPage1 =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: requestBase },
    );
  typia.assert(assignedPage1);
  TestValidator.equals(
    "data empty on first fetch",
    assignedPage1.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records=0",
    assignedPage1.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages=0", assignedPage1.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current is >=0",
    assignedPage1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is >=0",
    assignedPage1.pagination.limit >= 0,
  );
  const assignedP1L1 =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: requestPage1Limit1 },
    );
  typia.assert(assignedP1L1);
  const assignedP2L1 =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: requestPage2Limit1 },
    );
  typia.assert(assignedP2L1);
  const totalRecords = assignedP1L1.pagination.records;
  const page1Ids = assignedP1L1.data.map((p) => p.id);
  const page2Ids = assignedP2L1.data.map((p) => p.id);
  if (totalRecords > assignedP1L1.pagination.limit) {
    TestValidator.predicate(
      "page2 has at least one item",
      page2Ids.length >= 1,
    );
    const firstPageFirstId = page1Ids[0];
    TestValidator.predicate(
      "no repetition between page1 and page2 first ids",
      page2Ids[0] !== firstPageFirstId,
    );
  } else {
    TestValidator.equals(
      "page2 data empty when total<=limit",
      page2Ids.length,
      0,
    );
  }
  const assignedP1L1Repeat =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: requestPage1Limit1 },
    );
  typia.assert(assignedP1L1Repeat);
  TestValidator.equals(
    "first page first id stable",
    assignedP1L1Repeat.data[0]?.id ?? null,
    assignedP1L1.data[0]?.id ?? null,
  );
  // org scoping check when data is non-empty
  const scopeSource =
    assignedP1L1.data.length > 0 ? assignedP1L1 : assignedP2L1;
  if (scopeSource.data.length > 0) {
    const orgId = scopeSource.data[0].erp_hrm_time_tracking_organization_id;
    for (const item of scopeSource.data) {
      TestValidator.equals(
        "project org id matches selected context",
        item.erp_hrm_time_tracking_organization_id,
        orgId,
      );
    }
    const crossOrgIds = scopeSource.data.map(
      (p) => p.erp_hrm_time_tracking_organization_id,
    );
    TestValidator.predicate(
      "no cross-organization leakage",
      new Set(crossOrgIds).size === 1,
    );
  }
}
