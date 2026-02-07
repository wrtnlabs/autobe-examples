import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test retrieving a ban appeal that has been reviewed and rejected by an administrator.
 * The appeal should have status 'rejected' with a clear decision reason explaining
 * why the ban was upheld. Verify that all rejection details are properly recorded
 * including the reviewer's justification and the review timestamp.
 */
export async function test_api_ban_appeal_retrieval_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Note: This test scenario requires additional API endpoints for creating
  // ban records and ban appeals that are not available in the current SDK.
  // The test demonstrates the retrieval validation logic but cannot execute
  // the complete workflow without the missing creation endpoints.
  // For demonstration purposes, we'll show the intended validation logic
  // that would work if the creation endpoints were available
  // Retrieve a ban appeal (this would normally come from a previous creation step)
  const appeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.at(
      superAdminConnection,
      {
        banRecordId: typia.random<string & tags.Format<"uuid">>(),
        appealId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(appeal);
  // Validate rejection details (this assumes the appeal was properly rejected)
  TestValidator.equals(
    "appeal status should be rejected",
    appeal.status,
    "rejected",
  );
  TestValidator.predicate(
    "decision reason should be present",
    appeal.decision_reason !== null && appeal.decision_reason.length > 0,
  );
  TestValidator.predicate(
    "reviewer should be present",
    appeal.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed timestamp should be set",
    appeal.reviewed_at !== null,
  );
  // Validate appeal structure
  TestValidator.predicate(
    "appeal reason should be present",
    appeal.appeal_reason.length > 0,
  );
  TestValidator.predicate(
    "user summary should be present",
    appeal.user.id !== undefined,
  );
  TestValidator.predicate(
    "ban record should be present",
    appeal.banRecord.id !== undefined,
  );
}
