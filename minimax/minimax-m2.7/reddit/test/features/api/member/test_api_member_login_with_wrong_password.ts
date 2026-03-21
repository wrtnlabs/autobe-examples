import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure when incorrect password is provided.
 * 1. Register a new member account with known credentials
 * 2. Attempt to login with correct email but wrong password
 * 3. Verify HTTP 401 Unauthorized response is returned
 */
export async function test_api_member_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: "bob@example.com",
      password: "CorrectPass123!",
      username: "bob",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(registeredMember);
  // 2. Attempt to login with wrong password
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () =>
      await api.functional.redditClone.auth.member.login(connection, {
        body: {
          email: "bob@example.com",
          password: "WrongPassword456!",
          href: "http://localhost:3000/login",
          referrer: "http://localhost:3000/",
        } satisfies IRedditCloneMemberSession.ILogin,
      }),
  );
}
