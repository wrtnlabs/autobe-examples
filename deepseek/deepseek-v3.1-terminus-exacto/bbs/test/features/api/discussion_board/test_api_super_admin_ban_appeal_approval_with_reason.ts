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
 * Test the scenario where a super administrator approves a ban appeal with a comprehensive decision reason.
 * Since ban appeal creation endpoints are not available in the provided SDK, this test validates the
 * approval functionality using randomly generated ban and appeal IDs to test the status transition
 * and decision reason recording capabilities.
 */
export async function test_api_super_admin_ban_appeal_approval_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate random ban and appeal IDs (since creation endpoints are not available)
  const banId = typia.random<string & tags.Format<"uuid">>();
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // 3. Approve the appeal with decision reason
  const decisionReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
      superAdminConnection,
      {
        banId,
        appealId,
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // 4. Validate the response contains complete updated appeal record
  TestValidator.equals("appeal ID matches", updatedAppeal.id, appealId);
  TestValidator.equals("status is approved", updatedAppeal.status, "approved");
  TestValidator.equals(
    "decision reason matches",
    updatedAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    updatedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer admin is assigned",
    updatedAppeal.reviewer !== null,
  );
  // 5. Verify ban record relationship is loaded
  TestValidator.equals(
    "ban record ID matches",
    updatedAppeal.banRecord.id,
    banId,
  );
  // 6. Verify user relationship is loaded
  TestValidator.predicate(
    "user summary is present",
    updatedAppeal.user.id !== undefined,
  );
  TestValidator.predicate(
    "user has display name",
    updatedAppeal.user.display_name.length > 0,
  );
  // 7. Validate timestamp consistency
  TestValidator.predicate(
    "appealed_at is before reviewed_at",
    new Date(updatedAppeal.appealed_at) < new Date(updatedAppeal.reviewed_at!),
  );
  // 8. Validate reviewer admin information
  TestValidator.predicate(
    "reviewer has ID",
    updatedAppeal.reviewer!.id !== undefined,
  );
  TestValidator.predicate(
    "reviewer has email",
    updatedAppeal.reviewer!.email.length > 0,
  );
  TestValidator.predicate(
    "reviewer has display name",
    updatedAppeal.reviewer!.display_name.length > 0,
  );
}
