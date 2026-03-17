import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for member login authentication.
 * A registered member should be able to log in using their valid email address and correct password.
 * The system should validate the credentials against the stored account information,
 * create a new session record, and return JWT access and refresh tokens along with the member's profile information.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing login
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinName = RandomGenerator.name();
  const joinNickname = RandomGenerator.name();
  const joinOutput: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: joinEmail,
        password: joinPassword,
        name: joinName,
        nickname: joinNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(joinOutput);
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput: IMultiUserTodoMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IMultiUserTodoMember.ILogin,
    });
  typia.assert(loginOutput);
  // 3. Validate member information matches registered account
  TestValidator.equals("member id matches", loginOutput.id, joinOutput.id);
  TestValidator.equals("email matches", loginOutput.email, joinEmail);
  TestValidator.equals("name matches", loginOutput.name, joinName);
  TestValidator.equals("nickname matches", loginOutput.nickname, joinNickname);
  // 4. Validate account is active (not deleted)
  TestValidator.predicate(
    "deleted_at is null for active account",
    loginOutput.deleted_at === null,
  );
  // 5. Validate authorization tokens are present and usable
  TestValidator.predicate(
    "access token is present",
    loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(loginOutput.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(loginOutput.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(loginOutput.token.refreshable_until) >
      new Date(loginOutput.token.expired_at),
  );
}
