import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppHistoryMetadatum";
import type { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test user history metadata filtering for active settings with pagination validation.
 */
export async function test_api_user_history_metadata_filter_active_settings(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user);
  // Test 1: Retrieve active settings with default pagination
  const activeSettingsPage1 =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(activeSettingsPage1);
  // Validate all returned settings are active
  TestValidator.predicate(
    "all settings should be active",
    activeSettingsPage1.data.every((setting) => setting.is_active === true),
  );
  // Validate response structure
  TestValidator.predicate(
    "settings should have required fields",
    activeSettingsPage1.data.every(
      (setting) =>
        typeof setting.config_key === "string" &&
        typeof setting.config_value === "string" &&
        typeof setting.config_description === "string" &&
        typeof setting.is_active === "boolean" &&
        (setting.retention_days === null ||
          setting.retention_days === undefined ||
          Number.isInteger(setting.retention_days)) &&
        (setting.cleanup_frequency === null ||
          setting.cleanup_frequency === undefined ||
          typeof setting.cleanup_frequency === "string"),
    ),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    activeSettingsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    activeSettingsPage1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    activeSettingsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    activeSettingsPage1.pagination.pages >= 0,
  );
  // Test 2: Test different page with smaller limit
  if (activeSettingsPage1.pagination.pages > 1) {
    const activeSettingsPage2 =
      await api.functional.todoApp.user.history_metadata.index(userConnection, {
        body: {
          is_active: true,
          page: 2,
          limit: 5,
        } satisfies ITodoAppHistoryMetadatum.IRequest,
      });
    typia.assert(activeSettingsPage2);
    TestValidator.equals(
      "page 2 current page",
      activeSettingsPage2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit",
      activeSettingsPage2.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "page 2 all settings should be active",
      activeSettingsPage2.data.every((setting) => setting.is_active === true),
    );
  }
  // Test 3: Verify authorization by testing without authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("should reject unauthorized access", async () => {
    await api.functional.todoApp.user.history_metadata.index(
      unauthorizedConnection,
      {
        body: {
          is_active: true,
        } satisfies ITodoAppHistoryMetadatum.IRequest,
      },
    );
  });
}
