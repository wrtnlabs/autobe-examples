import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_community_member_create_public_community(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = ArrayUtil.repeat(1, () =>
    RandomGenerator.alphaNumeric(8),
  )
    .join("")
    .toLowerCase();
  const memberPassword = RandomGenerator.alphaNumeric(10);

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        nickname: memberNickname,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new public community
  const communityName = ArrayUtil.repeat(1, () =>
    RandomGenerator.alphaNumeric(10),
  )
    .join("")
    .toLowerCase();
  const communityTitle = `Community: ${RandomGenerator.name(2)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryName = "Technology";

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: communityTitle,
        description: communityDescription,
        category_name: categoryName,
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Validate community creation
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community title matches",
    community.title,
    communityTitle,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community category name matches",
    community.category.name,
    categoryName,
  );
  TestValidator.equals("community type is public", community.type, "public");
  TestValidator.equals(
    "community subscriber count starts at 0",
    community.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "community has valid creation timestamp",
    new Date(community.created_at).getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "community is not deleted",
    community.deleted_at === null,
  );

  // Step 4: Validate community name format (3-21 alphanumeric characters)
  TestValidator.predicate(
    "community name has correct length",
    community.name.length >= 3 && community.name.length <= 21,
  );
  TestValidator.predicate(
    "community name contains only alphanumeric and underscores",
    /^[a-zA-Z0-9_]+$/.test(community.name),
  );

  // Step 5: Validate other community properties
  TestValidator.predicate(
    "community title has correct length",
    community.title.length >= 1 && community.title.length <= 100,
  );
  TestValidator.predicate(
    "community description has correct length",
    community.description.length >= 1 && community.description.length <= 500,
  );
  TestValidator.equals(
    "community has allow crosspost setting",
    community.allow_crosspost,
    false,
  );
  TestValidator.equals(
    "community category is valid UUID",
    community.category.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.predicate(
    "community updates timestamp is not before creation time",
    new Date(community.updated_at).getTime() >=
      new Date(community.created_at).getTime(),
  );
}
