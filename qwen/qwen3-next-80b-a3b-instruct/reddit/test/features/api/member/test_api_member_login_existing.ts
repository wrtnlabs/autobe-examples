import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account using join operation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "StrongPass123!";
  const memberHref: string = "https://community-platform.com/join";
  const memberReferrer: string = "https://community-platform.com";
  const memberIp: string = typia.random<string & tags.Format<"ipv4">>();

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Log in with the same credentials
  const loggedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IMember.ILogin,
    });
  typia.assert(loggedMember);

  // Step 3: Validate successful login - token issuance and context
  TestValidator.equals(
    "member ID matches after join and login",
    createdMember.id,
    loggedMember.id,
  );
  TestValidator.equals(
    "member email matches after join and login",
    createdMember.email,
    loggedMember.email,
  );
  TestValidator.predicate(
    "token access exists",
    () => !!loggedMember.token.access,
  );
  TestValidator.predicate(
    "token refresh exists",
    () => !!loggedMember.token.refresh,
  );
  TestValidator.predicate(
    "token expired_at is valid date-time",
    () => new Date(loggedMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date-time",
    () => new Date(loggedMember.token.refreshable_until) > new Date(),
  );

  // Step 4: Verify login fails with incorrect password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: "WrongPassword123!",
          href: memberHref,
          referrer: memberReferrer,
          ip: memberIp,
        } satisfies IMember.ILogin,
      });
    },
  );

  // Step 5: Verify login fails with non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: "nonexistent@example.com",
          password: memberPassword,
          href: memberHref,
          referrer: memberReferrer,
          ip: memberIp,
        } satisfies IMember.ILogin,
      });
    },
  );
}
