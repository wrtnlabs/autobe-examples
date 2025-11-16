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

export async function test_api_vote_retrieval_vote_authenticity_verification(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post to vote on
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 7: Retrieve vote by ID to verify audit information
  const retrievedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.at(connection, {
      voteId: vote.id,
    });
  typia.assert(retrievedVote);

  // Validate vote authenticity and audit trail completeness
  TestValidator.equals(
    "retrieved vote ID matches created vote",
    retrievedVote.id,
    vote.id,
  );

  TestValidator.equals(
    "vote type is preserved",
    retrievedVote.vote_type,
    "upvote",
  );

  TestValidator.equals(
    "content type is preserved",
    retrievedVote.content_type,
    "post",
  );

  TestValidator.equals(
    "content ID matches voted post",
    retrievedVote.content_id,
    post.id,
  );

  TestValidator.equals(
    "voter member ID matches authenticated member",
    retrievedVote.community_platform_member_id,
    member.id,
  );

  // Validate member information is populated for audit trail
  TestValidator.predicate(
    "member summary contains username for identification",
    retrievedVote.member.username !== null &&
      retrievedVote.member.username !== undefined,
  );

  TestValidator.predicate(
    "member summary contains email for audit trail",
    retrievedVote.member.email !== null &&
      retrievedVote.member.email !== undefined,
  );

  TestValidator.predicate(
    "member summary contains karma score for reputation context",
    retrievedVote.member.karma_score >= 0,
  );

  TestValidator.predicate(
    "member account status indicates active voter",
    retrievedVote.member.account_status === "active",
  );

  // Validate timestamps for fraud detection timeline
  TestValidator.predicate(
    "creation timestamp is present for temporal tracking",
    retrievedVote.created_at !== null &&
      retrievedVote.created_at !== undefined &&
      retrievedVote.created_at.length > 0,
  );

  TestValidator.predicate(
    "vote is recent (created within reasonable timeframe)",
    new Date(retrievedVote.created_at).getTime() > Date.now() - 60000,
  );

  TestValidator.predicate(
    "updated timestamp may be null if vote unchanged",
    retrievedVote.updated_at === null ||
      retrievedVote.updated_at === undefined ||
      typeof retrievedVote.updated_at === "string",
  );
}
