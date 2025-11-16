import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_missing_credentials(
  connection: api.IConnection,
) {
  // Test 1: Login with neither email nor username provided
  await TestValidator.error(
    "login should fail when both email and username are missing",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          password: "validPassword123",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );

  // Test 2: Login with email and username explicitly set to undefined
  await TestValidator.error(
    "login should fail when email and username are explicitly undefined",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: undefined,
          username: undefined,
          password: "validPassword123",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );

  // Test 3: Login with email and username set to null
  await TestValidator.error(
    "login should fail when email and username are null",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: null,
          username: null,
          password: "validPassword123",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
