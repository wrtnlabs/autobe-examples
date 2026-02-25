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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials once for both join and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // 2. Join a new member account first
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await api.functional.discussionBoard.auth.member.join(
    joinConnection,
    {
      body: {
        email,
        password,
        displayName,
        passwordConfirmation: password, // Must match password field
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(joinedMember);
  // 3. Login with the joined member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedMember = await api.functional.discussionBoard.auth.member.login(
    loginConnection,
    {
      body: {
        email,
        password, // Use same password as join operation
        href: "https://example.com/discussion",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(loggedMember);
  // 4. Validate the login response
  TestValidator.equals(
    "member ID matches",
    loggedMember.member.id,
    joinedMember.member.id,
  );
  TestValidator.equals(
    "email matches",
    loggedMember.member.email,
    joinedMember.member.email,
  );
  TestValidator.equals(
    "displayName matches",
    loggedMember.member.display_name,
    joinedMember.member.display_name,
  );
  TestValidator.predicate(
    "has access_token",
    loggedMember.access_token.length > 0,
  );
  TestValidator.predicate(
    "has refresh_token",
    loggedMember.refresh_token.length > 0,
  );
  TestValidator.equals("is_active status", loggedMember.member.is_active, true);
  TestValidator.equals("is_admin status", loggedMember.member.is_admin, false);
  TestValidator.equals(
    "is_super_admin status",
    loggedMember.member.is_super_admin,
    false,
  );
}
