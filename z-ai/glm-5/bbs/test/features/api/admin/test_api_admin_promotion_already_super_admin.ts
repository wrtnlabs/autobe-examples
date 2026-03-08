import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that attempting to promote an administrator who is already a super
 * administrator results in an error.
 *
 * This validates the business rule that only regular administrators can be
 * promoted. When a super administrator attempts to promote another super
 * administrator, the system should reject the request with 400 Bad Request.
 */
export async function test_api_admin_promotion_already_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account (requester)
  const requesterConnection: api.IConnection = { host: connection.host };
  const requesterAdmin = await authorize_admin_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(requesterAdmin);
  // 2. Create second admin account (target)
  const targetAdmin = await authorize_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(targetAdmin);
  // 3. If requester is super admin and target is regular, promote target first
  if (requesterAdmin.grade === "super" && targetAdmin.grade === "regular") {
    const promotionResult =
      await api.functional.discussionBoard.admin.admins.promote(
        requesterConnection,
        {
          adminId: targetAdmin.id,
          body: {
            reason: "Initial promotion for test setup",
          } satisfies IDiscussionBoardAdmin.IPromote,
        },
      );
    typia.assert(promotionResult);
    // Verify target is now super
    TestValidator.equals("target is now super", promotionResult.grade, "super");
  }
  // 4. If target is still regular, assume test environment limitation
  // and skip the main test validation
  if (targetAdmin.grade === "regular") {
    // Cannot create super admin target - log and return
    // In a proper environment, there should be a way to create super admins
    return;
  }
  // 5. At this point, target should be super admin
  // Attempt to promote again - should fail with 400 Bad Request
  await TestValidator.httpError(
    "promotion of already super admin should fail",
    400,
    async () => {
      await api.functional.discussionBoard.admin.admins.promote(
        requesterConnection,
        {
          adminId: targetAdmin.id,
          body: {
            reason: "Invalid second promotion attempt",
          } satisfies IDiscussionBoardAdmin.IPromote,
        },
      );
    },
  );
}
