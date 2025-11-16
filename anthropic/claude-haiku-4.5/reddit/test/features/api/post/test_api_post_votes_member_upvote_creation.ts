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

export async function test_api_post_votes_member_upvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology_" + RandomGenerator.alphaNumeric(6),
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    password: "MemberPassword123!",
    username: RandomGenerator.alphaNumeric(8),
    href: "http://localhost:3000/auth/member",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: "comm_" + RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created successfully",
    community.identifier,
    communityData.identifier,
  );

  // Step 5: Create post in community
  const postData = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);
  TestValidator.equals("post created with zero upvotes", post.upvote_count, 0);
  TestValidator.equals(
    "post created with zero downvotes",
    post.downvote_count,
    0,
  );
  TestValidator.equals("post created with zero vote score", post.vote_score, 0);

  const initialUpvoteCount = post.upvote_count;
  const initialDownvoteCount = post.downvote_count;
  const initialVoteScore = post.vote_score;

  // Step 6: Create upvote on the post
  const upvoteData = {
    content_type: "post",
    content_id: post.id,
    vote_type: "upvote",
  } satisfies ICommunityPlatformVote.ICreate;

  const vote = await api.functional.communityPlatform.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: upvoteData,
    },
  );
  typia.assert(vote);

  // Step 7: Validate vote record properties
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals("vote content type is post", vote.content_type, "post");
  TestValidator.equals(
    "vote content id matches post id",
    vote.content_id,
    post.id,
  );
  TestValidator.predicate(
    "vote created at is set",
    vote.created_at !== null && vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote member is set",
    vote.member !== null && vote.member !== undefined,
  );

  // Step 8: Validate member reference in vote
  TestValidator.equals(
    "vote member id matches",
    vote.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "voter username is present",
    vote.member.username.length > 0,
  );
  TestValidator.predicate(
    "voter karma score is non-negative",
    vote.member.karma_score >= 0,
  );

  // Step 9: Validate timestamp format
  const isValidDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
    vote.created_at,
  );
  TestValidator.predicate(
    "vote created_at is ISO 8601 format",
    isValidDateFormat,
  );

  // Step 10: Validate vote impact on post metrics
  TestValidator.predicate(
    "upvote count should increment",
    post.upvote_count < 1,
  );
  TestValidator.predicate(
    "downvote count remains zero",
    post.downvote_count === 0,
  );
  TestValidator.predicate(
    "vote score equals upvotes minus downvotes",
    post.vote_score === post.upvote_count - post.downvote_count,
  );
}
