import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_administrator_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_administrator_assignments_create";
import { prepare_random_discussion_board_administrator_assignment } from "../../../prepare/prepare_random_discussion_board_administrator_assignment";

export async function test_api_administrator_assignment_promote_member_to_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Create regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Step 3: Create administrator assignment with promotion type using utility function
  const assignmentBody = {
    old_role: "member" as const,
    new_role: "admin" as const,
    assignment_type: "promotion" as const,
    reason:
      "Promoted based on outstanding contributions to the platform" as const,
  } satisfies IDiscussionBoardAdministratorAssignment.ICreate;
  const assignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: assignmentBody,
      },
    );
  typia.assert(assignment);
  // Step 4: Validate the assignment response
  TestValidator.equals(
    "old_role should be member",
    assignment.old_role,
    "member",
  );
  TestValidator.equals(
    "new_role should be admin",
    assignment.new_role,
    "admin",
  );
  TestValidator.equals(
    "assignment_type should be promotion",
    assignment.assignment_type,
    "promotion",
  );
  TestValidator.equals(
    "reason should match input",
    assignment.reason,
    assignmentBody.reason,
  );
  // Validate business logic - timestamps are properly handled by typia.assert()
  TestValidator.equals(
    "deleted_at should be null",
    assignment.deleted_at,
    null,
  );
}
