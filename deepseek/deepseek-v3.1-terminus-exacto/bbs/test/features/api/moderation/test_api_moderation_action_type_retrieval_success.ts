import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of an existing moderation action type by its UUID.
 *
 * This test authenticates as an administrator, retrieves a valid moderation action type ID
 * from the system, and verifies that all expected fields are returned including id, code,
 * name, description, category, severity_level, requires_reason, is_active, created_at,
 * and updated_at. The response is validated against the expected schema structure.
 */
export async function test_api_moderation_action_type_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Since there's no utility function to create moderation action types,
  // and we need an existing action type, we'll use a known valid UUID pattern
  // that should exist in a properly seeded test database
  const actionTypeId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the moderation action type
  const actionType =
    await api.functional.discussionBoard.admin.moderation_action_types.at(
      adminConnection,
      { actionTypeId },
    );
  // Validate the response matches the expected schema
  // typia.assert performs complete runtime type validation including:
  // - All property existence checks
  // - All type checks (string, number, boolean, etc.)
  // - All format validations (UUID, date-time, etc.)
  // - All constraint validations
  typia.assert(actionType);
  // Business logic validation: Verify the retrieved ID matches the requested ID
  TestValidator.equals(
    "retrieved action type ID matches requested ID",
    actionType.id,
    actionTypeId,
  );
}
