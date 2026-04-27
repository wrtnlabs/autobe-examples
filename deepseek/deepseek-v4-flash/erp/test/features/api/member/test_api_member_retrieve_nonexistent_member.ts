import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_retrieve_nonexistent_member(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a member profile using a UUID that does not correspond to any existing record.
   *
   * This test validates that a GET request with a valid UUID format that was never registered returns a 404 Not Found error. This confirms the endpoint correctly distinguishes between "record never existed" and other error conditions.
   *
   * 1. Generate a random valid UUID that was never registered in the system.
   * 2. Call GET /hrmTimeTracking/members/{memberId} with this UUID.
   * 3. Verify the response status is 404 Not Found.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "retrieve non-existent member returns 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.members.at(memberConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
