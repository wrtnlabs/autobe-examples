import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_create_invalid_name_characters(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Attempt to create community with invalid name (uppercase, space, symbols)
  await TestValidator.error(
    "community creation with invalid name characters should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Invalid Community Name!", // Contains uppercase, space, and symbol
            description: "A community with invalid name format",
            tags: ["invalid", "name", "test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
