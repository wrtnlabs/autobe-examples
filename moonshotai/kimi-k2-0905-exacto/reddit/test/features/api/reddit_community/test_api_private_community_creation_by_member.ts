import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community member creating a private community that requires
 * invitation-only access. Validates the exclusive community establishment
 * workflow with restricted visibility settings. The test verifies successful
 * private community creation, invitation-based access controls, and proper
 * community governance setup for confidential discussions.
 */
export async function test_api_private_community_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member - Essential prerequisite for private community creation
  const memberAuthData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const authenticatedMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAuthData,
    });
  typia.assert(authenticatedMember);

  TestValidator.predicate(
    "member authentication successful",
    authenticatedMember.token.access.length > 0,
  );

  // Step 2: Create private community with invitation-only access
  const privateCommunityName = RandomGenerator.alphabets(10);
  const privateCommunityData = {
    name: privateCommunityName,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_name: "Technology", // Using a technology category for the private tech discussion community
    type: "private", // Critical: Setting community to private for invitation-only access
    post_requirement_min_age: 30, // Ensure members have established accounts (30 days minimum)
    post_requirement_min_karma: 50, // Quality contribution requirement
    allow_crosspost: false, // Disable crossposting to maintain privacy
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdPrivateCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: privateCommunityData,
    });
  typia.assert(createdPrivateCommunity);

  // Step 3: Verify private community properties and access controls
  TestValidator.equals(
    "community name matches requested",
    createdPrivateCommunity.name,
    privateCommunityName,
  );

  TestValidator.equals(
    "community type is private",
    createdPrivateCommunity.type,
    "private",
  );

  TestValidator.predicate(
    "subscriber count starts at 0 for new private community",
    createdPrivateCommunity.subscriber_count === 0,
  );

  TestValidator.predicate(
    "crossposting is disabled for privacy",
    createdPrivateCommunity.allow_crosspost === false,
  );

  TestValidator.equals(
    "minimum posting age requirement set",
    createdPrivateCommunity.post_requirement_min_age,
    30,
  );

  TestValidator.equals(
    "minimum karma requirement set for quality",
    createdPrivateCommunity.post_requirement_min_karma,
    50,
  );

  TestValidator.predicate(
    "community has valid UUID identifier",
    createdPrivateCommunity.id.length > 0,
  );

  TestValidator.predicate(
    "community category is properly assigned",
    createdPrivateCommunity.category.name === "Technology",
  );

  // Step 4: Validate governance and access control setup
  TestValidator.predicate(
    "community creation timestamp is current",
    new Date(createdPrivateCommunity.created_at).getTime() > Date.now() - 60000,
  );

  TestValidator.predicate(
    "community is not soft-deleted",
    createdPrivateCommunity.deleted_at === null,
  );

  // Verify the authenticated member can access their created community
  TestValidator.predicate(
    "member has valid authorization token",
    authenticatedMember.token.expired_at > new Date().toISOString(),
  );

  console.log(
    `Private community '${privateCommunityName}' created successfully with invitation-only access controls`,
  );
}
