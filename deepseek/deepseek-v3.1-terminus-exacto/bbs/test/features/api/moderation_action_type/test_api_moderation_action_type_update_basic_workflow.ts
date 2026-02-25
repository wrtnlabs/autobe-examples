import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
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

export async function test_api_moderation_action_type_update_basic_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create new authenticated connection for super admin operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // Step 3: Prepare partial update data
  const updateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    category: null,
    severity_level: "high" as string | null | undefined,
    requires_reason: true,
    is_active: false,
  } satisfies IDiscussionBoardModerationActionType.IUpdate;
  // Step 4: Attempt to update with random ID (may fail with 404)
  const randomTypeId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Execute update operation
  const updatedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: randomTypeId,
        body: updateBody,
      },
    );
  // Step 6: Validate complete response structure
  typia.assert(updatedActionType);
  // Step 7: Verify the update was applied (API may create or update)
  TestValidator.equals(
    "code matches update",
    updatedActionType.code,
    updateBody.code!,
  );
  TestValidator.equals(
    "name matches update",
    updatedActionType.name,
    updateBody.name!,
  );
  TestValidator.equals(
    "description matches update",
    updatedActionType.description,
    updateBody.description!,
  );
  TestValidator.predicate(
    "category is null",
    updatedActionType.category === null,
  );
  TestValidator.equals(
    "requires reason matches",
    updatedActionType.requires_reason,
    updateBody.requires_reason!,
  );
  TestValidator.equals(
    "is_active matches",
    updatedActionType.is_active,
    updateBody.is_active!,
  );
  // Step 8: Validate timestamp is reasonable
  const updatedAt = new Date(updatedActionType.updated_at);
  const now = new Date();
  TestValidator.predicate("updated_at is valid", updatedAt <= now);
  // Step 9: Test partial update with only some fields
  const partialUpdateBody = {
    name: RandomGenerator.name(),
    is_active: true,
  } satisfies IDiscussionBoardModerationActionType.IUpdate;
  const partiallyUpdated =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: updatedActionType.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(partiallyUpdated);
  TestValidator.equals(
    "only name updated",
    partiallyUpdated.name,
    partialUpdateBody.name!,
  );
  TestValidator.equals(
    "only is_active updated",
    partiallyUpdated.is_active,
    partialUpdateBody.is_active!,
  );
  TestValidator.equals(
    "code unchanged",
    partiallyUpdated.code,
    updatedActionType.code,
  );
  TestValidator.equals(
    "description unchanged",
    partiallyUpdated.description,
    updatedActionType.description,
  );
}
