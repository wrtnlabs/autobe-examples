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
import { prepare_random_discussion_board_administrator_capability } from "../../../prepare/prepare_random_discussion_board_administrator_capability";

export async function test_api_administrator_capability_update_permission_level(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as super administrator
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies
        | string
        | null as string | null,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Create an initial capability assignment
  const initialCapability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: { administratorId: authorized.id },
        body: {
          capability_type: "content_moderation",
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(initialCapability);
  // Step 3: Update the capability's permission level
  const updatedCapability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.putByAdministratoridAndCapabilityid(
      superAdminConnection,
      {
        administratorId: authorized.id,
        capabilityId: initialCapability.id,
        body: {
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(updatedCapability);
  // Step 4: Validate the update results
  TestValidator.equals(
    "capability ID unchanged",
    updatedCapability.id,
    initialCapability.id,
  );
  TestValidator.equals(
    "capability type immutable",
    updatedCapability.capability_type,
    initialCapability.capability_type,
  );
  TestValidator.equals(
    "permission level updated",
    updatedCapability.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "assigned by unchanged",
    updatedCapability.assigned_by,
    initialCapability.assigned_by,
  );
  TestValidator.equals(
    "administrator unchanged",
    updatedCapability.administrator.id,
    initialCapability.administrator.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedCapability.updated_at,
    initialCapability.updated_at,
  );
  TestValidator.predicate(
    "deleted_at remains null",
    updatedCapability.deleted_at === null,
  );
}
