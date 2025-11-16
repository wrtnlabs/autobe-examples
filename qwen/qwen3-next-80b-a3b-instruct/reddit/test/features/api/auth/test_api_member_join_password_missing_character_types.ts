import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_join_password_missing_character_types(
  connection: api.IConnection,
) {
  // Test password missing uppercase letter
  await TestValidator.error(
    "password without uppercase should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "lowercase123!", // Missing uppercase
          href: "https://community-platform.com/join",
          referrer: "https://community-platform.com",
          ip: "192.168.1.100",
        } satisfies IMember.ICreate,
      });
    },
  );

  // Test password missing lowercase letter
  await TestValidator.error(
    "password without lowercase should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "UPPERCASE123!", // Missing lowercase
          href: "https://community-platform.com/join",
          referrer: "https://community-platform.com",
          ip: "192.168.1.100",
        } satisfies IMember.ICreate,
      });
    },
  );

  // Test password missing digit
  await TestValidator.error("password without digit should fail", async () => {
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "lowercaseUPPERCASE!", // Missing digit
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  });

  // Test password missing special character
  await TestValidator.error(
    "password without special character should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "lowercaseUPPERCASE123", // Missing special character
          href: "https://community-platform.com/join",
          referrer: "https://community-platform.com",
          ip: "192.168.1.100",
        } satisfies IMember.ICreate,
      });
    },
  );
}
