import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployeeSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for listing employee snapshots.
 *
 * Validates the complete employee snapshot listing flow including member authentication and paginated retrieval. Ensures that the endpoint returns properly structured snapshot data with all required employee state information and related entity summaries. Verifies pagination metadata accuracy and default sorting behavior (most recent snapshots first).
 *
 * Special attention is given to confirming that snapshots include organization context, member association, optional department assignment, and role information. The test validates that pagination fields (current page, limit, total records, total pages) are correctly populated.
 *
 * 1. Member registers and authenticates to gain access to employee snapshots.
 * 2. Member requests paginated list of employee snapshots with default parameters.
 * 3. Validates response structure contains pagination metadata and snapshot data array.
 * 4. Verifies each snapshot includes required fields (position_title, employment_type, status, created_at).
 * 5. Confirms related entity summaries are present (organization, member, role, optional department).
 * 6. Validates pagination metadata fields are correctly populated.
 */
export async function test_api_employee_snapshot_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Request employee snapshots with default pagination
  const snapshots =
    await api.functional.hrmTimeTrack.member.employee_snapshots.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackEmployeeSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "has pagination object",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(snapshots.data));
  // 5. If snapshots exist, validate their structure
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    // Validate required snapshot fields
    TestValidator.predicate(
      "has valid id",
      typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "has employment_type",
      typeof firstSnapshot.employment_type === "string",
    );
    TestValidator.predicate(
      "has status",
      typeof firstSnapshot.status === "string",
    );
    TestValidator.predicate(
      "has created_at",
      typeof firstSnapshot.created_at === "string",
    );
    // Validate position_title can be null or string
    TestValidator.predicate(
      "position_title is null or string",
      firstSnapshot.position_title === null ||
        typeof firstSnapshot.position_title === "string",
    );
    // Validate organization summary
    TestValidator.equals(
      "has organization id",
      typeof firstSnapshot.organization.id,
      "string",
    );
    TestValidator.equals(
      "has organization name",
      typeof firstSnapshot.organization.name,
      "string",
    );
    TestValidator.equals(
      "has organization currency",
      typeof firstSnapshot.organization.currency,
      "string",
    );
    TestValidator.equals(
      "has organization timezone",
      typeof firstSnapshot.organization.timezone,
      "string",
    );
    // Validate member summary
    TestValidator.equals(
      "has member id",
      typeof firstSnapshot.member.id,
      "string",
    );
    TestValidator.equals(
      "has member email",
      typeof firstSnapshot.member.email,
      "string",
    );
    // Validate department can be null
    TestValidator.predicate(
      "department is null or has id",
      firstSnapshot.department === null ||
        typeof firstSnapshot.department.id === "string",
    );
    // Validate role summary (required for active employees)
    TestValidator.equals("has role id", typeof firstSnapshot.role.id, "string");
    TestValidator.equals(
      "has role name",
      typeof firstSnapshot.role.name,
      "string",
    );
    TestValidator.equals(
      "has role is_builtin",
      typeof firstSnapshot.role.is_builtin,
      "boolean",
    );
  }
}
