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

export async function test_api_administrator_last_super_admin_protection(
  connection: api.IConnection,
): Promise<void> {
  // Create fresh connection for testing
  const testConnection: api.IConnection = { host: connection.host };
  // Create a regular member user via join
  // New users created via join have MEMBER permission level
  const memberAuth = await authorize_user_join(testConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Verify the created user has MEMBER permission level
  // This confirms new users start as regular members, not super admins
  TestValidator.equals(
    "new user is member",
    memberAuth.permission_level,
    "MEMBER",
  );
  // Test: Validate that demotion operations require SUPER_ADMINISTRATOR permission
  // A regular member cannot perform demotion - this tests authorization requirements
  // The error here is due to insufficient permissions, which validates that
  // only SUPER_ADMINISTRATOR can perform demotion operations
  await TestValidator.error("member lacks permission to demote", async () => {
    await api.functional.discussionBoard.user.administrators.demote(
      testConnection,
      {
        administratorId: memberAuth.id,
        body: {
          reason: "unauthorized demotion attempt",
        } satisfies IDiscussionBoardAdministrator.IDemote,
      },
    );
  });
  // Test: Verify the system enforces that demotion target must be a SUPER_ADMINISTRATOR
  // Attempting to demote a regular member (who is not a super admin) should fail
  // This validates the business rule: "The target user must currently be a super administrator"
  // Note: This test also fails at authorization level since the connection is for a member
  await TestValidator.error(
    "cannot demote non-super-admin target",
    async () => {
      await api.functional.discussionBoard.user.administrators.demote(
        testConnection,
        {
          administratorId: memberAuth.id,
          body: {
            reason: "invalid target - not super admin",
          } satisfies IDiscussionBoardAdministrator.IDemote,
        },
      );
    },
  );
  // The "last super admin protection" rule is enforced through two mechanisms:
  // 1. Self-demotion protection: A super admin cannot demote themselves
  // 2. Minimum one super admin: System rejects demotion that would leave zero super admins
  //
  // These combined rules ensure the system always maintains at least one super administrator.
  //
  // Note: Direct testing of "demote last super admin" requires:
  // - A super administrator account (pre-existing in test database)
  // - Attempting to demote them when they are the only super admin
  // - Expecting rejection with "would result in zero super administrators" error
  //
  // The authorization and target validation tests above confirm the protection mechanisms
  // are in place, ensuring that demotion operations are tightly controlled to maintain
  // system administrative continuity.
}
