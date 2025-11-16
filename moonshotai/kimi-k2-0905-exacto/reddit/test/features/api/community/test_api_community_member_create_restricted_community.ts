import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test a member creating a restricted community requiring approval for posting.
 *
 * This test validates community creation with restricted access type and proper
 * participation controls, including minimum account age and karma thresholds
 * for posting requirements.
 */
export async function test_api_community_member_create_restricted_community(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member using registration endpoint
  const memberData = {
    nickname: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Validate member authentication was successful
  TestValidator.predicate("member has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(member.id),
  );
  TestValidator.equals(
    "member email matches registration",
    member.email,
    memberData.email,
  );
  TestValidator.equals(
    "member nickname matches registration",
    member.nickname,
    memberData.nickname,
  );

  // Step 2: Create a restricted community with specific posting requirements
  const communityData = {
    name: `tech_discussion_${RandomGenerator.alphabets(6)}`,
    title: `Tech Discussion Hub - ${RandomGenerator.name(1)}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    category_name: "Technology",
    type: "restricted",
    post_requirement_min_age: 30, // 30 days minimum account age
    post_requirement_min_karma: 100, // 100 karma minimum for quality control
    allow_crosspost: false, // Disable crossposting for better control
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Validate the created community has correct restricted access type
  TestValidator.equals(
    "community type is restricted",
    community.type,
    "restricted",
  );
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community title matches input",
    community.title,
    communityData.title,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityData.description,
  );

  // Step 4: Validate posting requirements are properly configured
  TestValidator.equals(
    "minimum account age requirement set to 30 days",
    community.post_requirement_min_age,
    30,
  );
  TestValidator.equals(
    "minimum karma requirement set to 100",
    community.post_requirement_min_karma,
    100,
  );
  TestValidator.equals(
    "crossposting correctly disabled",
    community.allow_crosspost,
    false,
  );

  // Step 5: Validate community has proper initial state and category assignment
  TestValidator.predicate("community has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(community.id),
  );
  TestValidator.predicate(
    "subscriber count initialized to 0",
    () => community.subscriber_count === 0,
  );
  TestValidator.predicate(
    "category is assigned correctly",
    () => community.category.name === "Technology",
  );

  // Validate timestamps and community lifecycle
  TestValidator.predicate("created_at is valid ISO timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(community.created_at),
  );
  TestValidator.predicate("updated_at is valid ISO timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(community.updated_at),
  );
  TestValidator.equals("community is not deleted", community.deleted_at, null);

  // Step 6: Validate community name format constraints
  TestValidator.predicate(
    "community name is alphanumeric with underscores",
    () => /^[a-zA-Z0-9_]+$/.test(community.name),
  );
  TestValidator.predicate(
    "community name length is between 3-21 characters",
    () => community.name.length >= 3 && community.name.length <= 21,
  );
}
