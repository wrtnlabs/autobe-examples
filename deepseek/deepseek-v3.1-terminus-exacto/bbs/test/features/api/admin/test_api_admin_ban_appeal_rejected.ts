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

/**
 * Test the proper rejection of a ban appeal by an administrator.
 * 1. Create a regular user account
 * 2. Create an administrator account
 * 3. Generate a legitimate ban record for the user
 * 4. Have the user submit an appeal
 * 5. Authenticate as administrator and submit rejection decision
 * 6. Verify appeal status changes to 'rejected'
 * 7. Confirm ban status remains active
 * 8. Validate appeal record reflects rejection details
 */
export async function test_api_admin_ban_appeal_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // TODO: Create ban record for the user (missing ban creation endpoint)
  // TODO: User submits appeal (missing appeal submission endpoint)
  // Authenticate as administrator
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // TODO: Get appeal ID (need to create appeal first)
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // Submit rejection decision
  const reviewResult =
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      appealId,
      body: {
        status: "rejected",
        decision_reason:
          "Ban appeal rejected due to violation of community guidelines",
      } satisfies IDiscussionBoardBanAppeal.IReview,
    });
  typia.assert(reviewResult);
  // Validate appeal status changed to 'rejected'
  TestValidator.equals(
    "appeal status should be rejected",
    reviewResult.status,
    "rejected",
  );
  TestValidator.equals(
    "decision reason should match",
    reviewResult.decision_reason,
    "Ban appeal rejected due to violation of community guidelines",
  );
  TestValidator.notEquals(
    "reviewed_at should be set",
    reviewResult.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "reviewer should be set",
    reviewResult.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewer ID should match admin ID",
    reviewResult.reviewer!.id,
    admin.id,
  );
  // TODO: Validate ban remains active (need ban status verification endpoint)
  // TODO: Validate user cannot access protected resources (need protected resource endpoint)
}
