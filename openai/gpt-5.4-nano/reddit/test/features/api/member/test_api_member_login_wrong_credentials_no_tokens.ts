import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_credentials_no_tokens(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = typia.random<string & tags.Format<"password">>();
  let password2 = typia.random<string & tags.Format<"password">>();
  if (password2 === password1) {
    password2 = typia.random<string & tags.Format<"password">>();
  }
  // 1) Join a member account
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: password1,
    },
  });
  typia.assert(joined);
  const href = "https://example.com/auth/login" satisfies string &
    tags.Format<"uri">;
  const referrer = "https://example.com/auth" satisfies string &
    tags.Format<"uri">;
  const ip = "127.0.0.1" satisfies string & tags.Format<"ipv4">;
  const login1 = async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(loginConnection, {
      body: {
        email,
        password: password2,
        href,
        referrer,
        ip,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  };
  await TestValidator.httpError(
    "member login should reject wrong credentials with 401 (attempt 1)",
    401,
    login1,
  );
  const login2 = async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(loginConnection, {
      body: {
        email,
        password: password2,
        href,
        referrer,
        ip,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  };
  await TestValidator.httpError(
    "member login should reject wrong credentials with 401 (attempt 2)",
    401,
    login2,
  );
  // Non-disclosure check: unknown email should fail with same 401 for credential mismatch scenario.
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const login3 = async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(loginConnection, {
      body: {
        email: otherEmail,
        password: password2,
        href,
        referrer,
        ip,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  };
  await TestValidator.httpError(
    "member login should fail consistently with 401 even if email is unknown (non-disclosure check)",
    401,
    login3,
  );
}
