import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project listing with status filtering to verify lifecycle state filtering works correctly.
 *
 * Validates the project listing endpoint's ability to filter projects by their lifecycle status (active, archived, completed). Ensures that the status filter parameter correctly narrows down results to only include projects matching the specified status value.
 *
 * The test verifies that pagination metadata accurately reflects filtered result counts and that all returned projects in each filtered response have the correct status value.
 *
 * 1. Authenticate as a member using /auth/member/join
 * 2. Call /hrmTimeTrack/member/projects with status='active' filter
 * 3. Verify all returned projects have status='active'
 * 4. Call with status='archived' and verify only archived projects
 * 5. Call with status='completed' and verify only completed projects
 * 6. Call without status filter and verify all statuses included
 */
export async function test_api_project_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test with status='active' filter
  const activeResult = await api.functional.hrmTimeTrack.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IHrmTimeTrackProject.IRequest,
    },
  );
  typia.assert(activeResult);
  // Verify all projects in active result have status='active'
  for (const project of activeResult.data) {
    TestValidator.equals(
      `project ${project.id} has active status`,
      project.status,
      "active",
    );
  }
  // 3. Test with status='archived' filter
  const archivedResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        status: "archived",
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(archivedResult);
  // Verify all projects in archived result have status='archived'
  for (const project of archivedResult.data) {
    TestValidator.equals(
      `project ${project.id} has archived status`,
      project.status,
      "archived",
    );
  }
  // 4. Test with status='completed' filter
  const completedResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        status: "completed",
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(completedResult);
  // Verify all projects in completed result have status='completed'
  for (const project of completedResult.data) {
    TestValidator.equals(
      `project ${project.id} has completed status`,
      project.status,
      "completed",
    );
  }
  // 5. Test without status filter (should include all statuses)
  const allResult = await api.functional.hrmTimeTrack.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackProject.IRequest,
    },
  );
  typia.assert(allResult);
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination records match data length",
    allResult.pagination.records === allResult.data.length,
  );
  // Verify that unfiltered result count is sum of all filtered results
  const totalFiltered =
    activeResult.data.length +
    archivedResult.data.length +
    completedResult.data.length;
  TestValidator.equals(
    "total projects match sum of filtered results",
    allResult.data.length,
    totalFiltered,
  );
}
