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

export async function test_api_administrator_assignment_create_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(authorizedSuperAdmin);
  // 2. Create super administrator assignment
  const assignment =
    await api.functional.discussionBoard.superAdmin.administrators.create(
      superAdminConnection,
      {
        body: {
          permission_level: "super",
          super_admin_id: authorizedSuperAdmin.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment);
  // 3. Validate assignment properties
  TestValidator.equals(
    "assignment id should be uuid",
    typeof assignment.id,
    "string",
  );
  TestValidator.predicate(
    "permission level should be set",
    assignment.permission_level.length > 0,
  );
  TestValidator.predicate(
    "assignment date should be valid",
    new Date(assignment.assignment_date) instanceof Date,
  );
  TestValidator.equals(
    "should have super admin relationship",
    assignment.superAdmin !== null,
    true,
  );
  TestValidator.equals(
    "super admin id should match",
    assignment.superAdmin?.id,
    authorizedSuperAdmin.id,
  );
  TestValidator.predicate(
    "section should be assigned",
    assignment.section.id.length > 0,
  );
  TestValidator.predicate(
    "created at should be set",
    assignment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at should be set",
    assignment.updated_at.length > 0,
  );
}
