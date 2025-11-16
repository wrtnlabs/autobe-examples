import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_description_only(
  connection: api.IConnection,
) {
  // 1. Authenticate as member to create community
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "ValidPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new community
  const communityName: string = RandomGenerator.name();
  const communityDescription: string = RandomGenerator.paragraph();
  const communityTags: string[] = ArrayUtil.repeat(3, () =>
    RandomGenerator.alphaNumeric(5).toLowerCase(),
  ) as string[];

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

  // 3. Verify community was created with expected values
  TestValidator.equals(
    "Created community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "Created community description matches",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "Created community tag count matches",
    createdCommunity.tag_count,
    communityTags.length,
  );

  // 4. Update only the description - omit name field
  const newDescription: string = RandomGenerator.paragraph();
  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityCode: createdCommunity.code,
        body: {
          description: newDescription,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // 5. Verify name remains unchanged while description was updated
  TestValidator.equals(
    "Community name unchanged after update",
    updatedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "Community description updated successfully",
    updatedCommunity.description,
    newDescription,
  );

  // 6. Verify updated_at was updated after created_at
  await TestValidator.predicate("updated_at is after created_at", async () => {
    return (
      new Date(updatedCommunity.updated_at).getTime() >
      new Date(createdCommunity.created_at).getTime()
    );
  });
}
