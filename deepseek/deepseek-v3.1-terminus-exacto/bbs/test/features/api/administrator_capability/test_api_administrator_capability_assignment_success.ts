import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
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
import { generate_random_discussion_board_super_admin_administrators_capabilities_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_capabilities_create";
import { generate_random_discussion_board_super_admin_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_create";
import { prepare_random_discussion_board_administrator_capability } from "../../../prepare/prepare_random_discussion_board_administrator_capability";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_administrator_capability_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create a regular administrator (prerequisite)
  const regularAdmin =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {},
    );
  typia.assert(regularAdmin);
  // 3. Assign capability to the regular administrator
  const capability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: {
          administratorId: regularAdmin.id,
        },
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        },
      },
    );
  typia.assert(capability);
  // 4. Validate response structure
  TestValidator.equals(
    "capability type matches request",
    capability.capability_type,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level matches request",
    capability.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "assigned by matches super administrator",
    capability.assigned_by,
    superAdmin.id,
  );
  TestValidator.equals(
    "administrator relationship matches target",
    capability.administrator.id,
    regularAdmin.id,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    !isNaN(Date.parse(capability.created_at)),
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    !isNaN(Date.parse(capability.updated_at)),
  );
  TestValidator.predicate("id is defined", capability.id.length > 0);
}
