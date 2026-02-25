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

export async function test_api_administrator_capability_retrieval_mismatch_error(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Update connection headers with super admin token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // Create first administrator
  const firstAdmin =
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
  typia.assert(firstAdmin);
  // Create second administrator
  const secondAdmin =
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
  typia.assert(secondAdmin);
  // Assign capability to the first administrator
  const capability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(
      superAdminConnection,
      {
        administratorId: firstAdmin.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(capability);
  // Attempt to retrieve the capability using the second administrator's ID - should error
  await TestValidator.error("capability retrieval mismatch", async () => {
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.at(
      superAdminConnection,
      {
        administratorId: secondAdmin.id,
        capabilityId: capability.id,
      },
    );
  });
}
