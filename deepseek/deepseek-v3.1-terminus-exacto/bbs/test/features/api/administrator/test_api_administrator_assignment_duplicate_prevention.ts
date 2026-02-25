import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_create";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_administrator_assignment_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create first administrator assignment
  const firstAssignment =
    await api.functional.discussionBoard.superAdmin.administrators.create(
      superAdminConnection,
      {
        body: {
          permission_level: "admin",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(firstAssignment);
  // Attempt duplicate assignment - should fail
  await TestValidator.error(
    "duplicate administrator assignment attempt",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.create(
        superAdminConnection,
        {
          body: {
            permission_level: "admin",
            admin_id:
              firstAssignment.admin?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            super_admin_id: null,
          } satisfies IDiscussionBoardSuperAdmin.ICreate,
        },
      );
    },
  );
  // Verify first assignment is still valid
  TestValidator.notEquals(
    "first assignment should not be affected",
    firstAssignment.id,
    null,
  );
}
