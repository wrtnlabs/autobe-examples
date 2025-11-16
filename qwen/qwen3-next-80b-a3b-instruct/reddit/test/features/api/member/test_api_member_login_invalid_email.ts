import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_login_invalid_email(
  connection: api.IConnection,
) {
  const { id } = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com/",
      ip: "192.168.1.100",
    } satisfies IMember.ICreate,
  });

  typia.assert(id);

  await TestValidator.error(
    "invalid email format should fail login",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: "invalidemail",
          password: "StrongPassword123!",
          href: "https://community-platform.com/login",
          referrer: "https://community-platform.com/",
          ip: "192.168.1.100",
        } satisfies IMember.ILogin,
      });
    },
  );

  await TestValidator.error(
    "non-existent email should fail login",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "StrongPassword123!",
          href: "https://community-platform.com/login",
          referrer: "https://community-platform.com/",
          ip: "192.168.1.100",
        } satisfies IMember.ILogin,
      });
    },
  );
}
