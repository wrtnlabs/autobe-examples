import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test system settings retrieval with pagination.
 *
 * Validates that administrators can retrieve system-wide configuration settings
 * with proper pagination support, including pagination metadata and correct
 * response structure.
 */
export async function test_api_system_settings_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve system settings with default pagination
  const settingsPage =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsPage);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    settingsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    settingsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    settingsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    settingsPage.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation consistency
  const expectedPages = Math.ceil(
    settingsPage.pagination.records / settingsPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    settingsPage.pagination.pages,
    expectedPages,
  );
  // 5. Validate response data structure
  TestValidator.predicate("data is array", Array.isArray(settingsPage.data));
  TestValidator.predicate(
    "data length matches limit",
    settingsPage.data.length <= settingsPage.pagination.limit,
  );
  // 6. Validate each setting has required summary fields
  if (settingsPage.data.length > 0) {
    const firstSetting = settingsPage.data[0];
    typia.assert(firstSetting);
    TestValidator.predicate(
      "setting has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSetting.id,
      ),
    );
    TestValidator.predicate("setting has key", firstSetting.key.length > 0);
    TestValidator.predicate("setting has value", firstSetting.value.length > 0);
    TestValidator.predicate(
      "setting has valid created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSetting.created_at,
      ),
    );
    TestValidator.predicate(
      "setting has valid updated_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSetting.updated_at,
      ),
    );
  }
  // 7. Test with custom pagination parameters
  const customPage =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals(
    "custom pagination limit",
    customPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom data respects limit",
    customPage.data.length <= 10,
  );
}
