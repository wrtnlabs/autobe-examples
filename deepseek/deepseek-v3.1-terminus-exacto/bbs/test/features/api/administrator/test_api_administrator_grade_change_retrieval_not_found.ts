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

export async function test_api_administrator_grade_change_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: RandomGenerator.alphabets(10) + "@test.com",
      password: "password123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate valid but non-existent UUIDs using available methods
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const administratorId = Array.from(
    { length: 36 },
    () => RandomGenerator.pick([..."0123456789abcdef"]),
  ).join("");
  const gradeChangeId = Array.from(
    { length: 36 },
    () => RandomGenerator.pick([..."0123456789abcdef"]),
  ).join("");
  // Validate UUID format
  TestValidator.predicate(
    "administratorId is valid UUID",
    uuidPattern.test(administratorId),
  );
  TestValidator.predicate(
    "gradeChangeId is valid UUID",
    uuidPattern.test(gradeChangeId),
  );
  // Attempt to retrieve non-existent grade change record
  await TestValidator.error(
    "retrieve non-existent grade change record",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.grade_changes.at(
        superAdminConnection,
        {
          administratorId,
          gradeChangeId,
        },
      );
    },
  );
}