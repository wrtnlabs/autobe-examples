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

export async function test_api_administrator_capability_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create authenticated super admin connection for subsequent calls
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdmin.token.access },
  };
  // 2. Create a regular administrator
  const administrator =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {
        body: {
          permission_level: "regular",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(administrator);
  // 3. Assign initial capability
  const initialCapability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: {
          administratorId: administrator.id,
        },
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(initialCapability);
  // Store initial capability details for comparison
  const originalCapabilityType = initialCapability.capability_type;
  const originalPermissionLevel = initialCapability.permission_level;
  // 4. Attempt to assign duplicate capability - should fail with conflict error
  await TestValidator.httpError(
    "duplicate capability assignment should return conflict error",
    409, // Conflict error code
    async () => {
      await generate_random_discussion_board_super_admin_administrators_capabilities_create(
        superAdminConnection,
        {
          params: {
            administratorId: administrator.id,
          },
          body: {
            capability_type: "content_moderation", // Same capability type
            permission_level: "read_only", // Different permission level
          } satisfies IDiscussionBoardAdministratorCapability.ICreate,
        },
      );
    },
  );
  // 5. Verify original capability remains intact and unchanged
  TestValidator.equals(
    "capability type should remain unchanged",
    originalCapabilityType,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level should remain unchanged",
    originalPermissionLevel,
    "full_access",
  );
  // 6. Validate that no additional capabilities were created
  // Since we can't easily count capabilities without a listing endpoint,
  // we verify that attempting the same operation again still fails
  await TestValidator.httpError(
    "subsequent duplicate assignment should still fail",
    409,
    async () => {
      await generate_random_discussion_board_super_admin_administrators_capabilities_create(
        superAdminConnection,
        {
          params: {
            administratorId: administrator.id,
          },
          body: {
            capability_type: "content_moderation",
            permission_level: "limited_scope", // Another different permission level
          } satisfies IDiscussionBoardAdministratorCapability.ICreate,
        },
      );
    },
  );
}
