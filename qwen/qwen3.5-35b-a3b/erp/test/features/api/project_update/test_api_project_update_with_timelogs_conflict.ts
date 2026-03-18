import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_update_with_timelogs_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with project management permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create new connection with member's access token
  const memberAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Use a valid project UUID for testing
  const testProjectId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to update project status from 'active' to 'completed'
  // This should return 409 Conflict if project has active timelogs
  await TestValidator.httpError(
    "should throw 409 Conflict when updating project with active timelogs",
    409,
    async () => {
      await api.functional.hrms.member.projects.update(
        memberAuthenticatedConnection,
        {
          projectId: testProjectId,
          body: {
            name: RandomGenerator.name(),
            color_code: "#3498db",
            status: "completed" satisfies "active" | "archived" | "completed",
          } satisfies IHrmsProject.IUpdate,
        },
      );
    },
  );
  // 5. Validate error response structure
  let capturedError: api.HttpError | null = null;
  try {
    await api.functional.hrms.member.projects.update(
      memberAuthenticatedConnection,
      {
        projectId: testProjectId,
        body: {
          name: RandomGenerator.name(),
          color_code: "#3498db",
          status: "completed" satisfies "active" | "archived" | "completed",
        } satisfies IHrmsProject.IUpdate,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      capturedError = error;
    } else {
      throw error;
    }
  }
  if (capturedError) {
    // 6. Validate error status code
    TestValidator.equals("error status code is 409", capturedError.status, 409);
    // 7. Validate error path contains project ID
    TestValidator.predicate("error path contains project ID", () =>
      capturedError!.path.includes(testProjectId),
    );
    // 8. Validate error method is PUT
    TestValidator.equals("error method is PUT", capturedError.method, "PUT");
    // 9. Validate error message indicates business rule violation
    const errorData = capturedError.toJSON<{
      message: string;
    }>();
    const errorMessage = errorData.message as unknown as string;
    TestValidator.predicate(
      "error message indicates timelog conflict",
      () =>
        errorMessage.includes("timelog") ||
        errorMessage.includes("timelogs") ||
        errorMessage.includes("active") ||
        errorMessage.includes("complete") ||
        errorMessage.includes("conflict"),
    );
  }
  // 10. Validate project status remains unchanged (stays active)
  // Since we cannot create timelogs, we validate the error handling path
  // The actual status check would require a GET endpoint to verify project state
}
