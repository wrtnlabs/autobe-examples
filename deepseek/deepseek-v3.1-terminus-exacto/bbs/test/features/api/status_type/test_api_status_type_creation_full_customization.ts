import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
import { generate_random_discussion_board_super_admin_status_types_create } from "../../../generate/generate_random_discussion_board_super_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test creation of a new status type with all optional fields provided including custom display_order,
 * is_active status, and detailed description. Validate that explicitly provided display_order (e.g., 5)
 * and is_active (e.g., false) override the default values. Confirm that the description field accepts
 * detailed text explaining the status meaning. Test that the status type is created with the exact
 * custom values and remains consistent for system-wide use.
 */
export async function test_api_status_type_creation_full_customization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account with authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // 2. Create status type with all optional fields explicitly provided
  const createBody = {
    category: "article",
    code: "custom_status",
    display_name: "Custom Status Type",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 5,
      wordMax: 10,
    }) satisfies string as string,
    display_order: 5 satisfies number as number,
    is_active: false,
  } satisfies IDiscussionBoardStatusType.ICreate;
  const statusType =
    await api.functional.discussionBoard.superAdmin.status_types.create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(statusType);
  // 3. Validate that explicitly provided values override defaults
  TestValidator.equals(
    "category matches",
    statusType.category,
    createBody.category,
  );
  TestValidator.equals("code matches", statusType.code, createBody.code);
  TestValidator.equals(
    "display_name matches",
    statusType.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "description matches",
    statusType.description,
    createBody.description,
  );
  TestValidator.equals(
    "display_order is 5 (overrides default)",
    statusType.display_order,
    5,
  );
  TestValidator.equals(
    "is_active is false (overrides default)",
    statusType.is_active,
    false,
  );
  // 4. Validate system-generated fields
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(statusType.id),
  );
  TestValidator.predicate(
    "created_at is ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statusType.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statusType.updated_at),
  );
  TestValidator.equals("deleted_at is null", statusType.deleted_at, null);
}
