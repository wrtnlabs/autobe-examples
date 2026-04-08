import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test department update with non-existent department ID to validate 404 error handling.
 *
 * This test validates that attempting to update a department with a UUID that does not exist in the system returns a proper 404 Not Found error. The test ensures that the API correctly handles invalid department references without creating or modifying any data.
 *
 * The scenario authenticates a member, generates a random non-existent department ID, and attempts to update it with valid update data. The expected outcome is a 404 error response, confirming proper error handling for missing resources.
 *
 * 1. Authenticate as a member using authorize_member_join utility function
 * 2. Generate a random UUID that does not exist in the database
 * 3. Attempt to update the non-existent department with valid update payload
 * 4. Verify the API throws an HttpError with 404 status code
 * 5. Confirm no side effects occurred (no departments created or modified)
 */
export async function test_api_department_update_nonexistent_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate non-existent department ID
  const nonExistentDepartmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare update payload with valid data
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackDepartment.IUpdate;
  // 4. Attempt to update non-existent department and expect 404 error
  await TestValidator.httpError(
    "update non-existent department returns 404",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.departments.update(
        memberConnection,
        {
          departmentId: nonExistentDepartmentId,
          body: updateBody,
        },
      ),
  );
}
