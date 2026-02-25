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

export async function test_api_administrator_capability_update_validates_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create first administrator
  const admin1 =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {
        body: {
          permission_level: "full_access",
          admin_id: null,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(admin1);
  // 3. Create second administrator
  const admin2 =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {
        body: {
          permission_level: "limited_access",
          admin_id: null,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(admin2);
  // 4. Assign capability to first administrator
  const capability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: { administratorId: admin1.id },
        body: {
          capability_type: "content_moderation",
          permission_level: "read_write",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(capability);
  // 5. Attempt to update capability using second administrator's ID - should fail
  await TestValidator.error(
    "should reject capability update from wrong administrator",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.capabilities.putByAdministratoridAndCapabilityid(
        superAdminConnection,
        {
          administratorId: admin2.id,
          capabilityId: capability.id,
          body: {
            permission_level: "read_only",
          } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
        },
      );
    },
  );
  // 6. Verify capability can be updated by correct administrator
  const updatedCapability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.putByAdministratoridAndCapabilityid(
      superAdminConnection,
      {
        administratorId: admin1.id,
        capabilityId: capability.id,
        body: {
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(updatedCapability);
  TestValidator.equals(
    "permission level updated",
    updatedCapability.permission_level,
    "read_only",
  );
  TestValidator.notEquals(
    "capability ID unchanged",
    updatedCapability.id,
    capability.id,
  );
  TestValidator.equals(
    "administrator ID unchanged",
    updatedCapability.administrator.id,
    admin1.id,
  );
}
