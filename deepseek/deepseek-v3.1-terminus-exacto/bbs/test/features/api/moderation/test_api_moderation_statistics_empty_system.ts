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

export async function test_api_moderation_statistics_empty_system(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call moderation statistics endpoint
  const statistics =
    await api.functional.discussionBoard.superAdmin.moderation.statistics(
      superAdminConnection,
    );
  typia.assert(statistics);
  // The endpoint returns IDiscussionBoardContentModerationLog which is a single log entry
  // Since this is an empty system test, we validate that we receive a valid log structure
  // but cannot validate statistical counts as the API doesn't return aggregated statistics
  // Validate the basic structure of the moderation log entry
  TestValidator.predicate(
    "should have valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.id,
    ),
  );
  TestValidator.predicate(
    "should have non-empty action type",
    statistics.action_type.length > 0,
  );
  TestValidator.predicate(
    "should have non-empty target content type",
    statistics.target_content_type.length > 0,
  );
  TestValidator.predicate(
    "should have valid UUID target content ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.target_content_id,
    ),
  );
  // In an empty system, reason should be null
  TestValidator.equals(
    "reason should be null in empty system",
    statistics.reason,
    null,
  );
  TestValidator.predicate(
    "should have valid ISO date-time for created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statistics.created_at),
  );
  TestValidator.predicate(
    "should have valid ISO date-time for updated_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statistics.updated_at),
  );
  // Validate admin summary structure
  TestValidator.predicate(
    "admin should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.admin.id,
    ),
  );
  TestValidator.predicate(
    "admin should have valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(statistics.admin.email),
  );
  TestValidator.predicate(
    "admin should have non-empty display name",
    statistics.admin.display_name.length > 0,
  );
  TestValidator.predicate(
    "admin should have valid ISO date-time for created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statistics.admin.created_at),
  );
}
