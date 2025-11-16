import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_description_length_exceeded(
  connection: api.IConnection,
) {
  // Step 1: Register as member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community
  const communityName: string = RandomGenerator.name();
  const communityDescription: string =
    "A community for technology enthusiasts and developers.";
  const communityTags: (string & tags.MinLength<1> & tags.MaxLength<30>)[] = [
    "technology",
    "development",
    "code",
  ];

  const createdCommunity: ICommunityPlatformCommunity =
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
  typia.assert(createdCommunity);

  // Step 3: Update community description with length exceeding 500 characters
  const longDescription: string = ArrayUtil.repeat(501 / 10, () =>
    RandomGenerator.alphabets(10),
  ).join(" "); // Creates string of 501 chars

  await TestValidator.error(
    "community description length exceeding 500 characters should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: createdCommunity.code,
          body: {
            description: longDescription,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
