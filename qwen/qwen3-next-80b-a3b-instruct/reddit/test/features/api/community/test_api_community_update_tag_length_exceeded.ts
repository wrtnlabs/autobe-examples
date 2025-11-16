import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_tag_length_exceeded(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "ValidPass123!";
  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com";
  const ip: string = "192.168.1.100";

  // 1. Authenticate as member to create community
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

  // 2. Create a community with valid tags
  const communityName: string = RandomGenerator.name();
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 2,
  });

  const communityTags: (string & tags.MinLength<1> & tags.MaxLength<30>)[] = [
    "tech",
    "programming",
    "javascript",
  ];

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          tags: communityTags,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Submit update with tag exceeding 30 characters (31 characters)
  const longTag: string = "a".repeat(31); // Exactly 31 characters

  await TestValidator.error("tag length exceeds maximum limit", async () => {
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityCode: community.code,
        body: {
          tags: [longTag], // Should exceed 30-character limit
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  });
}
