import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_create_description_too_long(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "StrongPassword123!";
  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com/";
  const ip: string = "192.168.1.100";

  // Authenticate as member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Create community description with exactly 501 characters
  const description501 = "a".repeat(501);

  // Attempt to create community with description exceeding 500-character limit
  // This should fail with a 400 Bad Request error per schema constraints
  await TestValidator.error(
    "community creation should fail with description over 500 characters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.name(),
            description: description501,
            tags: ["community-test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
