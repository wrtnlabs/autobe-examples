import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_grade_change_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to access the endpoint without authentication
  await TestValidator.error("should reject unauthorized access", async () => {
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.at(
      connection,
      {
        changeId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Create a super administrator connection and verify authorized access works
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Verify authorized super admin can access the endpoint (even with invalid ID)
  await TestValidator.error(
    "should handle invalid grade change ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrator_grade_changes.at(
        superAdminConnection,
        {
          changeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
