import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test error handling when accessing project members for a non-existent project.
 *
 * Validates that the system properly handles requests to access project members when the specified project does not exist or is not accessible to the authenticated user. This test ensures appropriate error responses are returned for boundary conditions.
 *
 * 1. Authenticate as a member using the member registration endpoint
 * 2. Generate an invalid UUID that does not correspond to any existing project
 * 3. Attempt to access project members using the invalid project ID
 * 4. Verify the system throws an error with appropriate HTTP status code (404 Not Found or 403 Forbidden)
 */
export async function test_api_project_member_list_project_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate an invalid UUID (non-existent project)
  const invalidProjectId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare request body
  const body = {} satisfies IHrmTimeTrackProjectMember.IRequest;
  // 4. Verify the system throws an error when accessing non-existent project
  await TestValidator.error(
    "should throw error for non-existent project",
    async () => {
      await api.functional.hrmTimeTrack.member.projects.members.index(
        memberConnection,
        {
          projectId: invalidProjectId,
          body,
        },
      );
    },
  );
}
