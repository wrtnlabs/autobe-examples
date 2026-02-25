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

export async function test_api_administrator_assignment_create_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create administrator assignment with regular grade
  const createBody = {
    permission_level: "regular",
    admin_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardSuperAdmin.ICreate;
  const assignment =
    await api.functional.discussionBoard.superAdmin.administrators.create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(assignment);
  // Validate assignment structure
  TestValidator.equals(
    "permission level",
    assignment.permission_level,
    "regular",
  );
  TestValidator.predicate("has admin reference", assignment.admin !== null);
  TestValidator.predicate(
    "has section reference",
    assignment.section !== undefined,
  );
  TestValidator.predicate(
    "has valid timestamp",
    new Date(assignment.assignment_date).getTime() > 0,
  );
  TestValidator.equals(
    "admin id matches",
    assignment.admin?.id,
    createBody.admin_id,
  );
}
