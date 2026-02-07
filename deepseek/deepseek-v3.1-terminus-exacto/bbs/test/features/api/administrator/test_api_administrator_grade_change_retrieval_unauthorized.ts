import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test unauthorized access to administrator grade change retrieval.
 * Validates that non-administrator users cannot access sensitive administrator audit trail information.
 */
export async function test_api_administrator_grade_change_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "adminpassword123",
      display_name: "Administrator",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create and authenticate as regular user (non-administrator)
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: "user@test.com",
      password: "userpassword123",
      display_name: "Regular User",
      bio: "A regular user account",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Attempt to access administrator-only grade change endpoint with regular user credentials
  // Use the admin's ID as the administratorId since we know it exists
  await TestValidator.error(
    "non-administrator access to grade change",
    async () => {
      await api.functional.discussionBoard.admin.administrators.grade_changes.at(
        userConnection,
        {
          administratorId: admin.id,
          gradeChangeId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
