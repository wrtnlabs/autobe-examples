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
 * Validate the modification of vote records and temporal tracking.
 *
 * Tests that vote retrieval shows vote modification history through updated_at
 * timestamp. When a vote is created, its created_at timestamp is immutable.
 * When the vote is modified (changing vote_type from upvote to downvote), the
 * updated_at timestamp is refreshed to reflect the modification time. This
 * audit trail mechanism ensures vote changes are tracked for compliance and
 * historical analysis.
 *
 * Workflow:
 *
 * 1. Create and authenticate member account
 * 2. Create administrator account and category
 * 3. Create community for voting context
 * 4. Create post as voting target
 * 5. Create initial upvote on the post
 * 6. Verify initial vote timestamps (created_at set, updated_at empty)
 * 7. Modify vote by changing vote_type to downvote
 * 8. Retrieve modified vote to verify temporal tracking
 * 9. Confirm created_at unchanged and updated_at now set
 * 10. Validate both timestamps are ISO 8601 format
 */
export async function test_api_vote_retrieval_tracks_vote_modifications(
  connection: api.IConnection,
) {
  // 1. Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Create initial upvote
  const initialVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(initialVote);

  // 6. Verify initial vote timestamps
  TestValidator.equals(
    "initial vote type should be upvote",
    initialVote.vote_type,
    "upvote",
  );
  TestValidator.predicate(
    "initial vote should have created_at timestamp",
    initialVote.created_at !== null && initialVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "initial vote should have null or undefined updated_at",
    initialVote.updated_at === null || initialVote.updated_at === undefined,
  );

  // 7. Modify vote by changing vote_type to downvote
  const modifiedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(modifiedVote);

  // 8. Retrieve modified vote
  const retrievedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.at(connection, {
      voteId: modifiedVote.id,
    });
  typia.assert(retrievedVote);

  // 9. Confirm temporal tracking
  TestValidator.equals(
    "retrieved vote type should be downvote",
    retrievedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    retrievedVote.created_at,
    modifiedVote.created_at,
  );
  TestValidator.predicate(
    "updated_at should be set after modification",
    retrievedVote.updated_at !== null && retrievedVote.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at should differ from created_at for modified vote",
    retrievedVote.updated_at,
    retrievedVote.created_at,
  );

  // 10. Validate ISO 8601 format for timestamps
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedVote.created_at),
  );
  if (retrievedVote.updated_at) {
    TestValidator.predicate(
      "updated_at should be valid ISO 8601 date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedVote.updated_at),
    );
  }
}
