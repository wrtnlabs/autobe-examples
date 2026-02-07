import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the scenario where a super administrator demotes another super administrator to regular administrator grade.
 * Verifies that the grade field changes from 'super' to 'regular', the grade_changed_at timestamp is updated,
 * and the administrator record now references regular admin authentication instead of super admin authentication.
 * Also validates that super administrators cannot demote themselves.
 */
export async function test_api_administrator_demotion_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create two super administrator accounts
  const demoterConnection: api.IConnection = { host: connection.host };
  const targetConnection: api.IConnection = { host: connection.host };
  // Create demoter super admin account
  const demoterSuperAdmin = await authorize_super_admin_join(
    demoterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(demoterSuperAdmin);
  // Create target super admin account
  const targetSuperAdmin = await authorize_super_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(targetSuperAdmin);
  // Since we don't have utility functions to create administrator records,
  // we need to work with the existing system flow. The test will focus on
  // the demotion functionality assuming administrator records exist.
  // Demote the target super administrator to regular administrator
  const updatedAdministrator =
    await api.functional.discussionBoard.superAdmin.administrators.update(
      demoterConnection,
      {
        administratorId: targetSuperAdmin.id, // Using super admin ID as administrator ID
        body: {
          grade: "regular",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(updatedAdministrator);
  // Validate the demotion was successful
  TestValidator.equals(
    "grade should be 'regular'",
    updatedAdministrator.grade,
    "regular",
  );
  TestValidator.notEquals(
    "grade_changed_at should be updated",
    updatedAdministrator.grade_changed_at,
    null,
  );
  TestValidator.equals(
    "super_admin should be null",
    updatedAdministrator.super_admin,
    null,
  );
  TestValidator.notEquals(
    "admin should be populated",
    updatedAdministrator.admin,
    null,
  );
  TestValidator.predicate(
    "is_active should remain true",
    updatedAdministrator.is_active,
  );
  // Test that super administrators cannot demote themselves
  await TestValidator.error("should not allow self-demotion", async () => {
    await api.functional.discussionBoard.superAdmin.administrators.update(
      demoterConnection,
      {
        administratorId: demoterSuperAdmin.id,
        body: {
          grade: "regular",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  });
}
