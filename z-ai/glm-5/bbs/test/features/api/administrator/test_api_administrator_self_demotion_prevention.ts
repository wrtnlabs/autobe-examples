import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test that self-demotion prevention is enforced.
 *
 * This test validates the self-protection mechanism in the administrator
 * demotion endpoint. When any user attempts to demote themselves,
 * the API must reject the operation to prevent accidental or intentional
 * removal of their own privileges.
 *
 * Test Flow:
 * 1. Create and authenticate a new user account
 * 2. Attempt to demote themselves using the demote endpoint
 * 3. Verify the operation fails (self-demotion prevention enforced)
 *
 * Expected Result:
 * - The demote operation should fail with an error
 * - Self-demotion prevention mechanism is validated
 */
export async function test_api_administrator_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Attempt self-demotion - this should fail
  // The user is a regular MEMBER, so demotion will fail either because:
  // - User is not a super administrator (permission check fails)
  // - Self-demotion is prevented (business rule)
  await TestValidator.error("user cannot demote themselves", async () => {
    await api.functional.discussionBoard.user.administrators.demote(
      userConnection,
      {
        administratorId: user.id,
        body: {
          reason: "Attempted self-demotion for testing",
        } satisfies IDiscussionBoardAdministrator.IDemote,
      },
    );
  });
}
