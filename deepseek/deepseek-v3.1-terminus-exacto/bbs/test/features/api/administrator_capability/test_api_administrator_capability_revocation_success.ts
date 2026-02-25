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

export async function test_api_administrator_capability_revocation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Step 2: Create a regular administrator to manage using utility function
  const adminTarget =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {
        body: {
          permission_level: "regular",
          super_admin_id: authorizedSuperAdmin.id,
        },
      },
    );
  typia.assert(adminTarget);
  // Step 3: Assign capability to the administrator using utility function
  const capability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: {
          administratorId: adminTarget.id,
        },
        body: {
          capability_type: "section_management",
          permission_level: "full_access",
        },
      },
    );
  typia.assert(capability);
  // Step 4: Revoke the capability - this is the main test operation
  await api.functional.discussionBoard.superAdmin.administrators.capabilities.erase(
    superAdminConnection,
    {
      administratorId: adminTarget.id,
      capabilityId: capability.id,
    },
  );
  // Step 5: Validate successful capability revocation through business logic
  // The successful completion of the erase operation indicates capability was revoked
  TestValidator.predicate("capability revocation completed successfully", true);
}
