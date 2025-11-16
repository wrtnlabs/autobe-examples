import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "StrongPassword123!";
  const memberHref: string = "https://community-platform.com/join";
  const memberReferrer: string = "https://community-platform.com";
  const memberIp: string = "192.168.1.100";

  // Step 1: Create a member account for testing
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Login with the created account
  const loginResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: "https://community-platform.com/login",
        referrer: "https://community-platform.com",
        ip: memberIp,
      } satisfies IMember.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Validate the login response matches expectations
  TestValidator.equals("user ID should match", member.id, loginResponse.id);
  TestValidator.equals("email should match", member.email, loginResponse.email);

  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token should be a non-empty string",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    () => loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at should be in ISO 8601 format", () =>
    typia.is<tags.Format<"date-time">>(loginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until should be in ISO 8601 format",
    () =>
      typia.is<tags.Format<"date-time">>(loginResponse.token.refreshable_until),
  );
}
