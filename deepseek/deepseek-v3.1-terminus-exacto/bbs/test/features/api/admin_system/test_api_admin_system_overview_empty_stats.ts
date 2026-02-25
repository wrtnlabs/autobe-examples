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

export async function test_api_admin_system_overview_empty_stats(
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
  // Call the system overview endpoint
  const overview =
    await api.functional.discussionBoard.admin.system.overview.at(
      adminConnection,
    );
  typia.assert(overview);
  // The overview endpoint returns a system configuration entity
  // Validate that we receive a valid configuration object
  TestValidator.predicate(
    "should return valid system configuration",
    overview.id.length > 0 && /^[0-9a-f-]{36}$/i.test(overview.id),
  );
  TestValidator.predicate(
    "config key should be present",
    overview.config_key.length > 0,
  );
  TestValidator.predicate(
    "config value should be present",
    overview.config_value.length > 0,
  );
  TestValidator.predicate(
    "data type should be valid",
    ["string", "integer", "boolean", "number", "json"].includes(
      overview.data_type,
    ),
  );
}
