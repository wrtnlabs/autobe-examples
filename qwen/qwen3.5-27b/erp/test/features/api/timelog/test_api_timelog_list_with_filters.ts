import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing timelogs with filtering and pagination for authenticated members.
 *
 * Validates the complete timelog listing workflow including member authentication, empty filter request, and response validation. Ensures that the pagination metadata is correctly returned and that each timelog contains all required fields including project and employee information.
 *
 * Special attention is given to verifying that the response structure matches the expected DTO format, that pagination fields are present and valid, and that timelog relationships (project, employee, task) are properly populated.
 *
 * 1. Authenticate as a member to establish organization context.
 * 2. Call timelog listing endpoint with empty filter request body.
 * 3. Validate pagination metadata (current, limit, records, pages).
 * 4. Validate each timelog contains required fields and relationships.
 * 5. Verify default sorting by date descending.
 */
export async function test_api_timelog_list_with_filters(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Call timelog listing with empty filters
  const response = await api.functional.hrmTimeTrack.member.timelogs.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackTimelog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate timelog data structure
  if (response.data.length > 0) {
    const firstTimelog = response.data[0];
    // Validate business logic for timelog fields
    TestValidator.predicate(
      "timelog has positive duration",
      firstTimelog.duration_seconds > 0,
    );
    TestValidator.predicate(
      "timelog notes is string or null",
      firstTimelog.notes === null || typeof firstTimelog.notes === "string",
    );
    TestValidator.predicate(
      "timelog timesheet_status is string or null",
      firstTimelog.timesheet_status === null ||
        typeof firstTimelog.timesheet_status === "string",
    );
    // Validate project relationship exists and has valid status
    TestValidator.predicate(
      "timelog has project",
      firstTimelog.project !== null,
    );
    TestValidator.predicate(
      "project has valid status",
      ["active", "archived", "completed"].includes(firstTimelog.project.status),
    );
    // Validate employee relationship exists
    TestValidator.predicate(
      "timelog has employee",
      firstTimelog.employee !== null,
    );
    TestValidator.predicate(
      "employee has member",
      firstTimelog.employee.member !== null,
    );
    // Validate task relationship (nullable - may be null for project-level timelogs)
    if (firstTimelog.task !== null) {
      TestValidator.predicate(
        "task has valid priority",
        ["low", "medium", "high", "critical"].includes(
          firstTimelog.task.priority,
        ),
      );
    }
    // 5. Verify default sorting by date descending (if multiple timelogs)
    if (response.data.length > 1) {
      for (let i = 1; i < response.data.length; i++) {
        TestValidator.predicate(
          `timelogs sorted by date descending at index ${i}`,
          new Date(response.data[i - 1].date) >=
            new Date(response.data[i].date),
        );
      }
    }
  }
}
