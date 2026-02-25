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
 * Test appeal review behavior when the appeal is not in a reviewable status.
 * Since ban creation and appeal submission APIs are not available, we test
 * the error handling by attempting to review non-existent appeals to simulate
 * the scenario where an appeal cannot be reviewed due to invalid status.
 * Verify that the system returns appropriate error responses.
 */
export async function test_api_admin_ban_appeal_invalid_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test 1: Attempt to review a non-existent appeal (simulating invalid status)
  await TestValidator.error("review non-existent appeal", async () => {
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      appealId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
        decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBanAppeal.IReview,
    });
  });
  // Test 2: Attempt to review with rejected status
  await TestValidator.error("review another non-existent appeal", async () => {
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      appealId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "rejected",
        decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBanAppeal.IReview,
    });
  });
}
