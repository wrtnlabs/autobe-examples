import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account first
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const member = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(member);
  // Store the correct password for reference
  const correctPassword = joinBody.password;
  // Create a new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Test with wrong password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.communityPlatform.auth.member.login(
        loginConnection,
        {
          body: {
            email: member.email,
            password: `wrong_${correctPassword}_123`, // Definitely wrong password
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies ICommunityPlatformMember.ILogin,
        },
      );
    },
  );
  // Verify no authorization token was set on the connection
  TestValidator.equals(
    "connection should not have authorization header after failed login",
    loginConnection.headers?.Authorization,
    undefined,
  );
  // Verify last_login_at remains null (should only update on successful login)
  // We would need to retrieve member info to check, but there's no API for that
  // Instead, we'll test that a successful login with correct password updates it
  const successConnection: api.IConnection = { host: connection.host };
  const successLogin = await api.functional.communityPlatform.auth.member.login(
    successConnection,
    {
      body: {
        email: member.email,
        password: correctPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(successLogin);
  // Verify last_login_at is updated after successful login
  TestValidator.predicate(
    "last_login_at should be set after successful login",
    successLogin.last_login_at !== null,
  );
}
