import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
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

export async function test_api_superadmin_ban_duration_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since we cannot create ban durations in this test (no creation endpoint provided),
  // we need to assume there's at least one existing ban duration in the system.
  // We'll use a valid UUID format that might exist, but the test should handle
  // the case where it doesn't exist gracefully.
  const durationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve ban duration configuration
  const banDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.at(
      superAdminConnection,
      { durationId },
    );
  typia.assert(banDuration);
  // Validate all required fields are present and properly formatted
  TestValidator.equals("ban duration ID matches", banDuration.id, durationId);
  TestValidator.predicate(
    "name is non-empty string",
    banDuration.name.length > 0,
  );
  TestValidator.predicate(
    "description is non-empty string",
    banDuration.description.length > 0,
  );
  TestValidator.predicate(
    "duration hours is integer",
    Number.isInteger(banDuration.duration_hours),
  );
  TestValidator.predicate(
    "duration hours is positive",
    banDuration.duration_hours >= 0,
  );
  TestValidator.predicate(
    "is_permanent is boolean",
    typeof banDuration.is_permanent === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(new Date(banDuration.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(new Date(banDuration.updated_at).getTime()),
  );
  // Validate optional deleted_at field if present
  if (banDuration.deleted_at !== null && banDuration.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid date-time",
      !isNaN(new Date(banDuration.deleted_at).getTime()),
    );
  }
}
