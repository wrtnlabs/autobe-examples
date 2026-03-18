import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_project_membership_list_filtered_active_memberships(
  connection: api.IConnection,
): Promise<void> {
  const projectConnection: api.IConnection = {
    ...connection,
    host: connection.host,
  };
  const body = {
    search: "lead-target",
    membership_role: "project-lead",
    sort: "+membership_role",
    page: 1,
    limit: 1,
  } satisfies IHrmTimeTrackingProjectMembership.IRequest;
  const output =
    await api.functional.hrmTimeTracking.projects.memberships.index(
      projectConnection,
      {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert<IPageIHrmTimeTrackingProjectMembership.ISummary>(output);
  TestValidator.predicate(
    "response contains pagination and data",
    Array.isArray(output.data) && output.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current matches request",
    output.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    output.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length does not exceed requested limit",
    output.data.length <= body.limit,
  );
  for (const membership of output.data) {
    TestValidator.equals(
      "membership role matches request filter",
      membership.membership_role,
      body.membership_role,
    );
    TestValidator.equals("membership is active", membership.deleted_at, null);
    TestValidator.predicate(
      "employee summary remains attached",
      membership.employee !== undefined,
    );
  }
}
