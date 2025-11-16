import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_by_creator(
  connection: api.IConnection,
) {
  // 1. Register a new member to create and update a community
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

  // 2. Create a new community as the authenticated member
  const communityName: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const communityDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const tagsList: (string & tags.MinLength<1> & tags.MaxLength<30>)[] =
    ArrayUtil.repeat(3, () => RandomGenerator.alphaNumeric(6));

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          tags: tagsList,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Validate initial community data
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "community tag count matches",
    createdCommunity.tag_count,
    3,
  );

  // 3. Update the community name and description using the same authenticated connection
  const updatedCommunityName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedCommunityDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityCode: createdCommunity.code,
        body: {
          name: updatedCommunityName,
          description: updatedCommunityDescription,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // 4. Validate that the update succeeded
  TestValidator.equals(
    "community name was updated",
    updatedCommunity.name,
    updatedCommunityName,
  );
  TestValidator.equals(
    "community description was updated",
    updatedCommunity.description,
    updatedCommunityDescription,
  );

  // Verify that id and code remain unchanged
  TestValidator.equals(
    "community id remained unchanged",
    updatedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community code remained unchanged",
    updatedCommunity.code,
    createdCommunity.code,
  );

  // Verify that updated_at has been modified (is different from created_at)
  TestValidator.notEquals(
    "updated_at timestamp was modified",
    updatedCommunity.updated_at,
    createdCommunity.updated_at,
  );

  // Verify that the changed_at timestamp is after the originally created timestamp
  // Convert timestamps to Date objects for comparison
  const createdDate = new Date(createdCommunity.updated_at);
  const updatedDate = new Date(updatedCommunity.updated_at);
  TestValidator.predicate(
    "updated_at is later than created_at",
    updatedDate > createdDate,
  );
}
