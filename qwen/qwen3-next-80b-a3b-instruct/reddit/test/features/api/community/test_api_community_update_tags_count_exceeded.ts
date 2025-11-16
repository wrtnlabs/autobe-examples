import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_tags_count_exceeded(
  connection: api.IConnection,
) {
  // 1. Create a member account for testing
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

  // 2. Create a new community with valid initial tags
  const communityName = RandomGenerator.name();
  const communityDescription = RandomGenerator.paragraph();
  const initialTags: (string & tags.MinLength<1> & tags.MaxLength<30>)[] = [
    "technology",
    "gaming",
    "design",
    "art",
    "music",
  ];
  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          tags: initialTags,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // 3. Verify community was created with 5 tags
  TestValidator.equals("initial tag count", createdCommunity.tag_count, 5);

  // 4. Update the community with 6 tags, expecting 400 Bad Request error
  const newTags: (string & tags.MinLength<1> & tags.MaxLength<30>)[] = [
    "technology",
    "gaming",
    "design",
    "art",
    "music",
    "science",
  ];
  await TestValidator.error(
    "should reject update with more than 5 tags",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: createdCommunity.code,
          body: {
            tags: newTags,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
