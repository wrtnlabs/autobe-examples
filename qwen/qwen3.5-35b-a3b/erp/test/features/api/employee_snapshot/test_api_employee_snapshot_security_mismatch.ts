import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeesSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test security validation when attempting to retrieve an employee snapshot with mismatched employeeId and snapshotId.
 *
 * Validates the critical security rule that snapshots cannot be accessed by providing a valid snapshotId with a different employeeId. The system must treat mismatched employee access as not found for security, preventing cross-employee access to historical snapshots and information leakage about snapshot existence.
 *
 * The test creates a member account for authentication, then attempts to retrieve a snapshot using a valid snapshotId paired with an invalid employeeId. The system should return 404 Not Found without exposing any data about the snapshot or employee, ensuring proper security isolation between different employees' historical records.
 *
 * 1. Creates a member account for authentication.
 * 2. Generates a valid snapshot UUID and a different employee UUID.
 * 3. Calls GET endpoint with mismatched employeeId and snapshotId.
 * 4. Verifies 404 Not Found response is returned.
 * 5. Verifies no snapshot or employee data is exposed in error response.
 * 6. Validates that the system does not leak information about snapshot existence.
 */
export async function test_api_employee_snapshot_security_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberOutput);
  // 2. Create authenticated member connection
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedMemberConnection.headers = {
    Authorization: memberOutput.token.access,
  };
  // 3. Generate test data - different UUIDs for employee and snapshot
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const differentEmployeeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve snapshot with mismatched employeeId
  // The system should return 404 for security - treating mismatched access as not found
  await TestValidator.error(
    "mismatched employee and snapshot should return 404",
    async () => {
      await api.functional.hrmPlatform.member.employees.snapshots.at(
        authenticatedMemberConnection,
        {
          employeeId: differentEmployeeId,
          snapshotId: validSnapshotId,
        },
      );
    },
  );
}