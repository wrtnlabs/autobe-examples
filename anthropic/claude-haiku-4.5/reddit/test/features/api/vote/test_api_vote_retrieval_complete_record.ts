import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test retrieving a specific vote record by ID returns all vote details.
 *
 * This test validates the complete vote retrieval workflow including:
 *
 * - Administrator setup for environment configuration
 * - Category creation for community organization
 * - Member account creation for the community creator
 * - Community creation with proper categorization
 * - Post creation within the community
 * - Vote creation on the post
 * - Vote retrieval by ID with complete data validation
 *
 * The test ensures vote records contain complete traceability information
 * including voter member details, content type and ID, vote direction, and
 * timestamps for audit purposes.
 *
 * Steps:
 *
 * 1. Create administrator account for environment setup
 * 2. Create a category using administrator privileges
 * 3. Create member account as community creator
 * 4. Create community in the established category
 * 5. Create post in the community for voting
 * 6. Create vote on the post
 * 7. Retrieve the vote by ID
 * 8. Validate all vote details including member summary and timestamps
 */
export async function test_api_vote_retrieval_complete_record(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for environment setup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category using administrator privileges
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account as community creator
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphabets(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community in the established category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in the community for voting
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.content(),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create vote on the post
  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // Step 7: Retrieve the vote by ID
  const retrievedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.at(connection, {
      voteId: vote.id,
    });
  typia.assert(retrievedVote);

  // Step 8: Validate all vote details including member summary and timestamps
  TestValidator.equals(
    "retrieved vote ID matches created vote ID",
    retrievedVote.id,
    vote.id,
  );

  TestValidator.equals(
    "retrieved vote content type matches",
    retrievedVote.content_type,
    "post",
  );

  TestValidator.equals(
    "retrieved vote content ID matches post ID",
    retrievedVote.content_id,
    post.id,
  );

  TestValidator.equals(
    "retrieved vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );

  TestValidator.predicate(
    "vote has voter member information",
    retrievedVote.member !== null && retrievedVote.member !== undefined,
  );

  TestValidator.equals(
    "voter member ID matches",
    retrievedVote.community_platform_member_id,
    member.id,
  );

  TestValidator.predicate(
    "voter member summary has required fields",
    retrievedVote.member.id !== null &&
      retrievedVote.member.username !== null &&
      retrievedVote.member.email !== null &&
      retrievedVote.member.email_verified !== null &&
      retrievedVote.member.account_status !== null &&
      retrievedVote.member.karma_score !== null &&
      retrievedVote.member.created_at !== null,
  );

  TestValidator.predicate(
    "vote has created_at timestamp",
    retrievedVote.created_at !== null && retrievedVote.created_at !== undefined,
  );

  TestValidator.predicate(
    "vote creation timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedVote.created_at,
    ),
  );
}
