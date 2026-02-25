import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_admin_ban_appeal_approved(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Since ban creation and appeal submission APIs are not available in the provided SDK,
  // we'll test the appeal review functionality with a simulated appeal ID
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // Administrator reviews and approves the appeal
  const reviewDecision = {
    status: "approved" as const,
    decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardBanAppeal.IReview;
  const appeal = await api.functional.discussionBoard.admin.appeals.review(
    adminConnection,
    {
      appealId,
      body: reviewDecision,
    },
  );
  typia.assert(appeal);
  // Validate the appeal response structure
  TestValidator.equals(
    "appeal status should be approved",
    appeal.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason should match",
    appeal.decision_reason,
    reviewDecision.decision_reason,
  );
  TestValidator.predicate(
    "reviewed at should be set",
    appeal.reviewed_at !== null,
  );
  TestValidator.predicate("reviewer should be set", appeal.reviewer !== null);
  // Validate ban record information
  TestValidator.predicate("ban record should exist", appeal.banRecord !== null);
  TestValidator.predicate(
    "banned user should exist",
    appeal.banRecord.bannedUser !== null,
  );
  TestValidator.predicate(
    "banning administrator should exist",
    appeal.banRecord.banningAdministrator !== null,
  );
  // Validate appeal timestamps
  TestValidator.predicate(
    "appealed at should be set",
    appeal.appealed_at !== null,
  );
  TestValidator.predicate(
    "created at should be set",
    appeal.created_at !== null,
  );
  TestValidator.predicate(
    "updated at should be set",
    appeal.updated_at !== null,
  );
}
