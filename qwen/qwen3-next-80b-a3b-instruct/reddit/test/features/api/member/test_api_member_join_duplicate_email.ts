import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email for the first registration
  const uniqueEmail: string = typia.random<string & tags.Format<"email">>();

  // Create first member with valid data
  const firstMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: uniqueEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(firstMember);

  // Test duplicate email registration - should fail with 409 Conflict
  await TestValidator.error(
    "duplicate email registration should fail with 409 Conflict",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: uniqueEmail, // Same email as first registration
          password: "AnotherSecurePass456!",
          href: "https://community-platform.com/join",
          referrer: "https://community-platform.com",
          ip: "192.168.1.101",
        } satisfies IMember.ICreate,
      });
    },
  );
}
