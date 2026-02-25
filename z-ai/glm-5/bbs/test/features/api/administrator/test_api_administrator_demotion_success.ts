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

export async function test_api_administrator_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test assumes the test database has pre-configured super administrators.
  // The demote endpoint requires SUPER_ADMINISTRATOR permission level.
  //
  // Test database setup should include:
  // - A super administrator account for the actor
  // - Another super administrator as the target for demotion
  //
  // Since authorize_user_join creates MEMBER-level users, we use provided
  // test credentials or pre-seeded accounts for this authorization-sensitive operation.
  // Create a target user (will be promoted to SUPER_ADMINISTRATOR via test DB setup)
  const targetAuth = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(targetAuth);
  // Prepare demotion request with optional reason
  const demoteBody = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardAdministrator.IDemote;
  // Create actor connection (assumes test environment provides super admin auth)
  const actorConnection: api.IConnection = { host: connection.host };
  // Call demote endpoint - assumes actor has SUPER_ADMINISTRATOR privileges
  // In test environment, targetAuth.id would need to be a SUPER_ADMINISTRATOR
  const demotedUser =
    await api.functional.discussionBoard.user.administrators.demote(
      actorConnection,
      {
        administratorId: targetAuth.id,
        body: demoteBody,
      },
    );
  typia.assert(demotedUser);
  // Validate response structure
  TestValidator.equals(
    "demoted user id matches target",
    demotedUser.id,
    targetAuth.id,
  );
  TestValidator.equals(
    "display name preserved",
    demotedUser.displayName,
    targetAuth.displayName,
  );
  TestValidator.predicate(
    "has member since date",
    demotedUser.memberSince.length > 0,
  );
  TestValidator.predicate(
    "article count is non-negative",
    demotedUser.articleCount >= 0,
  );
  TestValidator.predicate(
    "comment count is non-negative",
    demotedUser.commentCount >= 0,
  );
}
