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

export async function test_api_administrator_capability_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
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
  typia.assert(superAdminAuth);
  // Copy authorization token to superAdmin connection
  superAdminConnection.headers = {
    Authorization: superAdminAuth.token.access,
  };
  // 2. Create a regular administrator account
  const administrator =
    await api.functional.discussionBoard.superAdmin.administrators.create(
      superAdminConnection,
      {
        body: {
          permission_level: "admin",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(administrator);
  // 3. Assign capability to the administrator
  const capability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(
      superAdminConnection,
      {
        administratorId: administrator.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(capability);
  // 4. Retrieve the capability using the exact IDs
  const retrievedCapability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.at(
      superAdminConnection,
      {
        administratorId: administrator.id,
        capabilityId: capability.id,
      },
    );
  typia.assert(retrievedCapability);
  // 5. Validate the retrieved capability matches the created one
  TestValidator.equals(
    "capability ID matches",
    retrievedCapability.id,
    capability.id,
  );
  TestValidator.equals(
    "capability type matches",
    retrievedCapability.capability_type,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level matches",
    retrievedCapability.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "administrator reference matches",
    retrievedCapability.administrator.id,
    administrator.id,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedCapability.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedCapability.updated_at !== undefined,
  );
  TestValidator.predicate(
    "assigned_by exists",
    retrievedCapability.assigned_by !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedCapability.deleted_at === null,
  );
}
