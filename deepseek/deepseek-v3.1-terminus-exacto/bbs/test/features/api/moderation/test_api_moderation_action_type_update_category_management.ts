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

export async function test_api_moderation_action_type_update_category_management(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test assumes an existing moderation action type is available
  // for testing categorization updates. In a complete test suite, this would
  // be created via a proper creation endpoint or test setup.
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since no creation endpoint is available in the provided APIs,
  // this test focuses on the categorization update workflow assuming
  // an existing moderation action type exists with ID available for testing
  const existingActionTypeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test adding categorization and severity level to existing action type
  const categorizedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: existingActionTypeId,
        body: {
          category: "content_moderation",
          severity_level: "high",
        } satisfies IDiscussionBoardModerationActionType.IUpdate,
      },
    );
  typia.assert(categorizedActionType);
  // 3. Validate categorization was applied correctly
  TestValidator.equals(
    "category should be set",
    categorizedActionType.category,
    "content_moderation",
  );
  TestValidator.equals(
    "severity_level should be set",
    categorizedActionType.severity_level,
    "high",
  );
  // 4. Test removing categorization by setting to null
  const uncategorizedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: existingActionTypeId,
        body: {
          category: null,
          severity_level: null,
        } satisfies IDiscussionBoardModerationActionType.IUpdate,
      },
    );
  typia.assert(uncategorizedActionType);
  // 5. Validate null values are properly handled
  TestValidator.equals(
    "category should be null",
    uncategorizedActionType.category,
    null,
  );
  TestValidator.equals(
    "severity_level should be null",
    uncategorizedActionType.severity_level,
    null,
  );
  TestValidator.predicate(
    "requires_reason should be boolean",
    typeof uncategorizedActionType.requires_reason === "boolean",
  );
  TestValidator.predicate(
    "is_active should be boolean",
    typeof uncategorizedActionType.is_active === "boolean",
  );
  TestValidator.predicate(
    "created_at should be valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      uncategorizedActionType.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at should be valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      uncategorizedActionType.updated_at,
    ),
  );
}
