import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Create a member account first for testing login
  const joinEmail: string = typia.random<string & tags.Format<"email">>();
  const joinPassword: string = RandomGenerator.alphaNumeric(16);
  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com";
  const ip: string = "192.168.1.100";

  const joinedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: joinEmail,
        password: joinPassword,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(joinedMember);

  // Step 2: Test login with correct email but wrong password
  const wrongPassword: string = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "Login with incorrect password should return 401 Unauthorized",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: joinEmail,
          password: wrongPassword, // Correct email, wrong password
          href,
          referrer,
          ip,
        } satisfies IMember.ILogin,
      });
    },
  );
}
