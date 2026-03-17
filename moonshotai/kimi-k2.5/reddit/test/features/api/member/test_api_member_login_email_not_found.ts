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

export async function test_api_member_login_email_not_found(
  connection: api.IConnection,
) {
  // Test member login with non-existent email address.
  //
  // Setup:
  // - Generate a randomized email that has never been registered
  // - Use a valid password format that meets requirements
  //
  // Test Steps:
  // - Call POST /redditLike/auth/member/login with non-existent email
  // - Verify 401 Unauthorized response (generic authentication failure)
  // - Ensure no JWT tokens are returned
  // - Error message is generic, identical to wrong password scenario
  const memberConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies IRedditLikeMember.ILogin;
  await TestValidator.httpError(
    "login with non-existent email should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.redditLike.auth.member.login(memberConnection, {
        body: loginBody,
      });
    },
  );
}
