import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validates that attempting to delete a non-existent department returns 404.
 *
 * Authenticates a member to establish an organization context. Then attempts to delete a department using a randomly generated UUID that does not exist in the current context. Verifies that the API correctly returns a 404 Not Found status, ensuring no state modifications occur for invalid resource references.
 *
 * 1. Authenticate a member to join the platform and establish context.
 * 2. Generate a random UUID that is guaranteed to be non-existent.
 * 3. Attempt to delete the non-existent department.
 * 4. Validate that the request fails with a 404 status code.
 *
 * @see DELETE /hrmPlatform/member/departments/{departmentId}
 */
export async function test_api_department_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const nonExistentDepartmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "deleting a non-existent department returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.departments.erase(
        memberConnection,
        {
          departmentId: nonExistentDepartmentId,
        },
      );
    },
  );
}
