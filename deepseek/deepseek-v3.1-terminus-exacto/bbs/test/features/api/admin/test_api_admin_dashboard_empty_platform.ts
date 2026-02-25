import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Call dashboard endpoint
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Validate dashboard response structure
  TestValidator.equals("dashboard has id", typeof dashboard.id, "string");
  TestValidator.equals(
    "dashboard has config_key",
    typeof dashboard.config_key,
    "string",
  );
  TestValidator.equals(
    "dashboard has config_value",
    typeof dashboard.config_value,
    "string",
  );
  TestValidator.equals(
    "dashboard has data_type",
    typeof dashboard.data_type,
    "string",
  );
  TestValidator.equals(
    "dashboard has description",
    typeof dashboard.description,
    "string",
  );
  TestValidator.equals(
    "dashboard has category",
    typeof dashboard.category,
    "string",
  );
  TestValidator.equals(
    "dashboard has is_sensitive",
    typeof dashboard.is_sensitive,
    "boolean",
  );
  TestValidator.equals(
    "dashboard has created_at",
    typeof dashboard.created_at,
    "string",
  );
  TestValidator.equals(
    "dashboard has updated_at",
    typeof dashboard.updated_at,
    "string",
  );
  TestValidator.predicate(
    "deleted_at can be null",
    dashboard.deleted_at === null || typeof dashboard.deleted_at === "string",
  );
}
