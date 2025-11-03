import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_remove_soft_delete_account(
  connection: api.IConnection,
) {
  /**
   * Test: soft-delete (erase) moderator account by username.
   *
   * Steps:
   *
   * 1. Create a new moderator via POST /auth/moderator/join using
   *    IDiscussionBoardModerator.ICreate.
   * 2. Assert the join response (IAuthorized) and record username.
   * 3. Call DELETE /discussionBoard/moderator/moderators/:moderatorUsername to
   *    soft-delete the account (erase).
   * 4. Attempt the same erase again and assert it fails (error thrown), which
   *    demonstrates that the account is no longer active (soft-deleted) and
   *    further privileged operations are rejected.
   */

  // 1) Prepare a unique moderator creation request
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    username,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // 2) Create moderator and obtain authorization tokens
  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Business-level validation: username in response matches requested username
  TestValidator.equals(
    "created moderator username matches",
    authorized.username,
    createBody.username,
  );

  // 3) Soft-delete (erase) the moderator by username
  await api.functional.discussionBoard.moderator.moderators.erase(connection, {
    moderatorUsername: authorized.username,
  });

  // 4) Post-condition: trying to erase again should fail (account already removed)
  await TestValidator.error(
    "erasing already removed moderator should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.erase(
        connection,
        {
          moderatorUsername: authorized.username,
        },
      );
    },
  );
}
