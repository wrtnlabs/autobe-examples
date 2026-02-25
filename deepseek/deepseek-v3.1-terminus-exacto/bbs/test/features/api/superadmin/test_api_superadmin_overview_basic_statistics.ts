import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the superAdmin overview endpoint to retrieve basic platform statistics.
 * Authenticate as superAdmin, then call the overview endpoint to verify it returns
 * comprehensive platform statistics including system configuration data.
 */
export async function test_api_superadmin_overview_basic_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Call the superAdmin overview endpoint
  const overview =
    await api.functional.discussionBoard.superAdmin.overview.at(
      superAdminConnection,
    );
  typia.assert(overview);
  // Validate the response contains meaningful configuration data
  TestValidator.predicate(
    "config_key is not empty",
    overview.config_key.length > 0,
  );
  TestValidator.predicate(
    "config_value is provided",
    overview.config_value.length >= 0,
  );
  TestValidator.predicate(
    "description is provided",
    overview.description.length > 0,
  );
  TestValidator.predicate("category is provided", overview.category.length > 0);
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(new Date(overview.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(new Date(overview.updated_at).getTime()),
  );
}
