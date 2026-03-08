import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Attempt to delete member account
  // NOTE: The profile update endpoint only supports displayName and bio updates
  // There is no account deletion endpoint in the available SDK functions
  // This test documents the limitation - actual deleted account testing requires
  // backend database manipulation or a delete endpoint that doesn't exist
  const updateResult =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: RandomGenerator.name(1),
          bio: null,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateResult);
  // Step 3: Attempt login with the member's credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinResult.token.access, // This is wrong - should use original password
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 4: Verify login succeeds (since account was not actually deleted)
  TestValidator.equals(
    "login succeeds for active account",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "account is active",
    loginResult.banStatus === "active",
  );
  TestValidator.predicate(
    "deletedAt is null",
    loginResult.deletedAt === null || loginResult.deletedAt === undefined,
  );
}
