import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
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
 * Test that an authenticated administrator can successfully retrieve a specific
 * system configuration setting by its unique key identifier.
 *
 * This test validates the primary success path for administrative access to
 * system configuration values, ensuring that:
 * - Admin authentication is properly established
 * - System settings can be retrieved by key
 * - Response contains all required fields with correct types
 * - Retrieved setting is an active (non-deleted) record
 */
export async function test_api_system_setting_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random setting key to retrieve
  const settingKey: string = typia.random<string>();
  // 3. Retrieve system setting by key
  const setting = await api.functional.discussionBoard.admin.system.settings.at(
    adminConnection,
    {
      settingKey,
    },
  );
  typia.assert(setting);
  // 4. Validate business logic
  TestValidator.equals("setting key matches request", setting.key, settingKey);
  TestValidator.predicate(
    "setting has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      setting.id,
    ),
  );
  TestValidator.predicate(
    "setting is active (not deleted)",
    setting.deleted_at === null,
  );
}
