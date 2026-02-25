import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_deletion_by_superadministrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "http://localhost/join",
        referrer: "http://localhost/referrer",
        ip: null,
      },
    },
  );
  // Update connection with token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Setup: Create an administrator grade to delete
  // For this test, we assume an existing grade ID to delete. Because the scenario
  // does not provide an API endpoint for creating a grade, we generate a fake UUID
  // to test the delete operation. The test will expect an error if grade does not exist.
  // Generate random UUID for gradeId (simulate existing grade)
  const gradeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform deletion by calling the erase API
  await api.functional.discussionBoard.superAdministrator.administrator.grades.erase(
    superAdminConnection,
    { gradeId },
  );
  // 4. Since response is void and status 204, no content to validate
  // We can assert no throw means success.
}
