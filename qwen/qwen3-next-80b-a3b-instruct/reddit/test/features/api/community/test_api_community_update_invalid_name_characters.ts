import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_invalid_name_characters(
  connection: api.IConnection,
) {
  // 1. Authenticate as new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community with valid name
  const communityName = "ValidCommunityName";
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: "A valid community for testing",
          tags: ["test", "sample"],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Submit update with invalid name (containing space) - wrapped in TestValidator.error
  const invalidCommunityName = "Invalid Community Name"; // contains space
  await TestValidator.error(
    "community name with spaces should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: community.code,
          body: {
            name: invalidCommunityName,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );

  // 4. Re-authenticate to ensure fresh context
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        password: "AnotherSecurePassword456!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(member2);

  // 5. Create another community
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "AnotherValidCommunity",
          description: "Another community for testing",
          tags: ["test2", "sample2"],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // 6. Update with special character (exclamation) - wrapped in TestValidator.error
  const invalidCommunityName2 = "Invalid-Community!Name"; // contains special character
  await TestValidator.error(
    "community name with exclamation should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: community2.code,
          body: {
            name: invalidCommunityName2,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
