import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_creation_excessive_tags(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member to create community
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Attempt to create community with six tags (exceeding maximum of five)
  // This should fail with validation error since tag limit is 5
  await TestValidator.error(
    "community creation should reject when exceeding 5 tags",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Excessive Tags Community",
            description: "Community created to test tag limit enforcement",
            tags: [
              "tag1",
              "tag2",
              "tag3",
              "tag4",
              "tag5",
              "tag6", // This sixth tag should trigger validation error
            ],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 3: Verify that community was not created (no side effects)
  // The error above should prevent any community from being created
  // No assertion needed here as error validation ensures no side effect
}
