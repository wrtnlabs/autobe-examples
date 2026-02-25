import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
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

/**
 * Test moderation statistics endpoint with super administrator authentication.
 * Verifies that the statistics API returns valid moderation log data structure
 * even with operational limitations on creating new moderation records.
 */
export async function test_api_moderation_statistics_populated_system(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using available utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://discussion-board.test/auth/super-admin",
      referrer: "https://discussion-board.test/",
      ip: "192.168.1.1",
    },
  });
  // Call the moderation statistics endpoint
  const statistics =
    await api.functional.discussionBoard.superAdmin.moderation.statistics(
      superAdminConnection,
    );
  // Validate the response structure using typia
  typia.assert(statistics);
  // Validate basic structure of moderation log data
  TestValidator.equals(
    "statistics has valid UUID id",
    typeof statistics.id,
    "string",
  );
  TestValidator.predicate("id matches UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.id,
    ),
  );
  TestValidator.equals(
    "statistics has action type",
    typeof statistics.action_type,
    "string",
  );
  TestValidator.predicate(
    "action type is not empty",
    () => statistics.action_type.length > 0,
  );
  TestValidator.equals(
    "statistics has target content type",
    typeof statistics.target_content_type,
    "string",
  );
  TestValidator.predicate(
    "target content type is not empty",
    () => statistics.target_content_type.length > 0,
  );
  TestValidator.equals(
    "statistics has target content id",
    typeof statistics.target_content_id,
    "string",
  );
  TestValidator.predicate("target content id matches UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.target_content_id,
    ),
  );
  // Validate timestamps
  TestValidator.predicate(
    "created at is valid ISO date",
    () => !isNaN(new Date(statistics.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at is valid ISO date",
    () => !isNaN(new Date(statistics.updated_at).getTime()),
  );
  // Validate admin structure
  typia.assert(statistics.admin);
  TestValidator.equals(
    "admin has valid UUID id",
    typeof statistics.admin.id,
    "string",
  );
  TestValidator.predicate("admin id matches UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.admin.id,
    ),
  );
  TestValidator.equals(
    "admin has email",
    typeof statistics.admin.email,
    "string",
  );
  TestValidator.predicate("admin email is valid format", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(statistics.admin.email),
  );
  TestValidator.equals(
    "admin has display name",
    typeof statistics.admin.display_name,
    "string",
  );
  TestValidator.predicate(
    "admin display name is not empty",
    () => statistics.admin.display_name.length > 0,
  );
  TestValidator.predicate(
    "admin created at is valid ISO date",
    () => !isNaN(new Date(statistics.admin.created_at).getTime()),
  );
}
