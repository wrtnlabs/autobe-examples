import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create a registered and verified member account via join endpoint
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();

  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(joinResponse);

  // Step 2: Use the created member credentials to test login
  const loginResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Validate the login response contains expected information
  TestValidator.equals(
    "member ID matches expected",
    loginResponse.id,
    joinResponse.id,
  );

  // Validate access token is present and non-empty
  TestValidator.predicate(
    "access token exists",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loginResponse.token.refresh.length > 0,
  );
}
