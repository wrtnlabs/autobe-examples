import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_self_deletion_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "1234",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const registeredMember = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(registeredMember);
  // 2. Login as the member to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginData = {
    email: memberData.email,
    password: memberData.password,
  } satisfies IRedditLikeMember.ILogin;
  const loggedMember = await authorize_member_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loggedMember);
  // 3. Attempt account deletion with incorrect password using authenticated connection
  await TestValidator.error(
    "deletion should fail with wrong password",
    async () => {
      await api.functional.redditLike.member.users.erase(loginConnection, {
        userId: loggedMember.id,
        body: {
          password: "wrongpassword123",
        } satisfies IRedditLikeMember.IDeleteRequest,
      });
    },
  );
  // 4. Verify account remains intact - can still login
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyLogin = await authorize_member_login(verifyConnection, {
    body: loginData,
  });
  typia.assert(verifyLogin);
  // 5. Verify user can still access profile
  TestValidator.equals(
    "user ID should match after failed deletion",
    verifyLogin.id,
    registeredMember.id,
  );
  // 6. Verify email and username are unchanged
  TestValidator.equals(
    "email should match after failed deletion",
    verifyLogin.email,
    memberData.email,
  );
  TestValidator.equals(
    "username should match after failed deletion",
    verifyLogin.username,
    memberData.username,
  );
}
