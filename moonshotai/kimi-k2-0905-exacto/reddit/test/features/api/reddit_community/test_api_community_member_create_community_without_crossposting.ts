import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_community_member_create_community_without_crossposting(
  connection: api.IConnection,
) {
  // 1. Register as a member to get authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community with crossposting explicitly disabled
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_name: "technology", // Using a common category name
        type: "public",
        allow_crosspost: false, // Explicitly disable crossposting
        post_requirement_min_age: 0,
        post_requirement_min_karma: 0,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Validate that the community was created with crossposting disabled
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "allow_crosspost is false",
    community.allow_crosspost,
    false,
  );
  TestValidator.equals("community type is public", community.type, "public");
  TestValidator.predicate("community has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(community.id),
  );
  TestValidator.predicate(
    "community has subscriber count",
    () => community.subscriber_count >= 0,
  );
}
