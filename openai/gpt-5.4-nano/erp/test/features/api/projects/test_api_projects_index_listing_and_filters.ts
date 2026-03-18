import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
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
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_projects_index_listing_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join to create fresh organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!" satisfies string,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) create baseline dataset with known statuses
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const created: IErpHrmTimeTrackingProject.ISummary[] = [];
  const statusSet = ["active", "archived"] as const;
  for (const status of statusSet) {
    const project =
      await generate_random_erp_hrm_time_tracking_member_projects_create(
        memberConnection,
        {
          body: {
            name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
            color: "#1a2b3c",
            status,
          },
        },
      );
    typia.assert(project);
    created.push({
      id: project.id,
      name: project.name,
      color: project.color,
      status: project.status,
      erp_hrm_time_tracking_organization_id:
        project.erp_hrm_time_tracking_organization_id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      deleted_at: project.deleted_at,
    });
  }
  // add completed for status filter test
  const completedProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
          color: "#2b3c4d",
          status: "completed",
        },
      },
    );
  typia.assert(completedProject);
  created.push({
    id: completedProject.id,
    name: completedProject.name,
    color: completedProject.color,
    status: completedProject.status,
    erp_hrm_time_tracking_organization_id:
      completedProject.erp_hrm_time_tracking_organization_id,
    created_at: completedProject.created_at,
    updated_at: completedProject.updated_at,
    deleted_at: completedProject.deleted_at,
  });
  const orgId = created[0].erp_hrm_time_tracking_organization_id;
  for (const c of created) {
    TestValidator.equals(
      "same organization",
      c.erp_hrm_time_tracking_organization_id,
      orgId,
    );
  }
  // Scenario 1: default listing no status filter, page 1
  const page1 = await api.functional.erpHrmTimeTracking.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit,
      },
    },
  );
  typia.assert(page1);
  const allowedStatuses = ["active", "archived", "completed"] as const;
  for (const item of page1.data) {
    TestValidator.predicate(
      "status is allowed",
      (allowedStatuses as readonly string[]).includes(item.status),
    );
    TestValidator.equals(
      "project is scoped",
      item.erp_hrm_time_tracking_organization_id,
      orgId,
    );
  }
  TestValidator.equals("pagination current", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records >= data length",
    page1.pagination.records >= page1.data.length,
  );
  // Call again with different pagination param
  const page2 = await api.functional.erpHrmTimeTracking.member.projects.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("pagination current page2", page2.pagination.current, 2);
  if (page1.pagination.pages > 1 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((x) => x.id));
    const page2Ids = new Set(page2.data.map((x) => x.id));
    const intersectionSize = [...page2Ids].filter((id) =>
      page1Ids.has(id),
    ).length;
    TestValidator.predicate(
      "page2 is different slice",
      intersectionSize < page2Ids.size,
    );
  }
  // Scenario 2: status filtering
  const activePage =
    await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit,
        },
      },
    );
  typia.assert(activePage);
  for (const item of activePage.data) {
    TestValidator.equals("all active", item.status, "active");
  }
  const completedPage =
    await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection,
      {
        body: {
          status: "completed",
          page: 1,
          limit,
        },
      },
    );
  typia.assert(completedPage);
  for (const item of completedPage.data) {
    TestValidator.equals("all completed", item.status, "completed");
  }
  // Scenario 3a: delete/unavailable exclusion (use archived project)
  const toDeleteArchived = created.find((x) => x.status === "archived");
  if (!toDeleteArchived) throw new Error("archived project not found");
  await api.functional.erpHrmTimeTracking.member.projects.erase(
    memberConnection,
    {
      projectId: toDeleteArchived.id,
    },
  );
  const afterDelete =
    await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit,
        },
      },
    );
  typia.assert(afterDelete);
  const afterIds = new Set(afterDelete.data.map((x) => x.id));
  TestValidator.predicate(
    "deleted project excluded",
    !afterIds.has(toDeleteArchived.id),
  );
  const expectedNonDeletedCount = created.filter(
    (x) => x.id !== toDeleteArchived.id,
  ).length;
  TestValidator.equals(
    "pagination records matches non-deleted created projects",
    afterDelete.pagination.records,
    expectedNonDeletedCount,
  );
  // Scenario 2 no-matches: delete completed project and ensure completed filter returns empty page
  await api.functional.erpHrmTimeTracking.member.projects.erase(
    memberConnection,
    {
      projectId: completedProject.id,
    },
  );
  const completedAfterDeletePage =
    await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection,
      {
        body: {
          status: "completed",
          page: 1,
          limit,
        },
      },
    );
  typia.assert(completedAfterDeletePage);
  TestValidator.equals(
    "completed no-matches returns empty data",
    completedAfterDeletePage.data.length,
    0,
  );
  TestValidator.equals(
    "completed no-matches pagination records",
    completedAfterDeletePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "completed no-matches pagination pages",
    completedAfterDeletePage.pagination.pages,
    0,
  );
}
