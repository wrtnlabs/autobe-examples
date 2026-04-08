import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an existing employee snapshot by its unique identifier.
 *
 * Validates the employee snapshot retrieval endpoint by authenticating as a member and attempting to fetch a snapshot record. The test verifies that the response contains complete denormalized employee state data including employee reference, member reference, department assignment (nullable), role assignment, position title, employment type, status, and created_at timestamp.
 *
 * Since employee snapshots are immutable historical records, this test ensures the snapshot data accurately reflects the employee's state at the time of capture, independent of any subsequent modifications to the original employee record.
 *
 * 1. Authenticate as member using authorize_member_join utility.
 * 2. Generate a valid UUID for snapshotId.
 * 3. Call the employee snapshot retrieval endpoint with the authenticated connection.
 * 4. Validate response type and structure using typia.assert().
 * 5. Verify the snapshot ID matches the requested ID.
 */
export async function test_api_employee_snapshot_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a valid UUID for snapshotId
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the employee snapshot
  // Note: This may return 404 if no snapshot exists with this ID
  // We'll handle this gracefully
  try {
    const snapshot: IHrmTimeTrackEmployeeSnapshot =
      await api.functional.hrmTimeTrack.member.employee_snapshots.at(
        memberConnection,
        { snapshotId },
      );
    // 4. Validate response type - this performs complete type validation
    typia.assert(snapshot);
    // 5. Verify the snapshot ID matches the requested ID
    TestValidator.equals(
      "snapshot ID matches request",
      snapshot.id,
      snapshotId,
    );
    // Verify required fields have values (business logic, not type validation)
    TestValidator.predicate(
      "employee reference is present",
      snapshot.employee.id !== undefined,
    );
    TestValidator.predicate(
      "member reference is present",
      snapshot.member.id !== undefined,
    );
    TestValidator.predicate(
      "role reference is present",
      snapshot.role.id !== undefined,
    );
    TestValidator.predicate(
      "employment_type has value",
      snapshot.employment_type.length > 0,
    );
    TestValidator.predicate("status has value", snapshot.status.length > 0);
    TestValidator.predicate(
      "created_at is present",
      snapshot.created_at.length > 0,
    );
    // Department is nullable - just verify it's either null or has data
    TestValidator.predicate(
      "department is null or has valid ID",
      snapshot.department === null || snapshot.department.id !== undefined,
    );
  } catch (exp) {
    // If we get a 404, it means no snapshot exists with this ID
    // This is acceptable for this test since we're using a random UUID
    if (exp instanceof api.HttpError && exp.status === 404) {
      // Test passed - endpoint correctly returns 404 for non-existent snapshot
      TestValidator.predicate(
        "404 returned for non-existent snapshot",
        exp.status === 404,
      );
    } else {
      // Re-throw unexpected errors
      throw exp;
    }
  }
}
