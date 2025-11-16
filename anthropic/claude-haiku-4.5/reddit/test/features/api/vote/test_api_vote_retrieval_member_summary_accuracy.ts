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

export async function test_api_vote_retrieval_member_summary_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to set up platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@12345",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(4),
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to be the voter
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "Member@12345",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech-" + RandomGenerator.alphaNumeric(4),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Great tech discussion topic",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Cast a vote (upvote) on the post
  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // Step 7: Retrieve the vote by its ID
  const retrievedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.at(connection, {
      voteId: vote.id,
    });
  typia.assert(retrievedVote);

  // Step 8: Verify member summary information in the retrieved vote
  TestValidator.equals(
    "member summary username matches voter username",
    retrievedVote.member.username,
    memberUsername,
  );

  TestValidator.equals(
    "member summary email matches voter email",
    retrievedVote.member.email,
    memberEmail,
  );

  TestValidator.equals(
    "member summary ID matches voter ID",
    retrievedVote.member.id,
    member.id,
  );

  TestValidator.predicate(
    "member summary email_verified status exists",
    typeof retrievedVote.member.email_verified === "boolean",
  );

  TestValidator.predicate(
    "member summary account_status is one of valid statuses",
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      retrievedVote.member.account_status,
    ),
  );

  TestValidator.predicate(
    "member summary karma_score is a non-negative integer",
    retrievedVote.member.karma_score >= 0 &&
      Number.isInteger(retrievedVote.member.karma_score),
  );

  // Step 9: Verify vote's own attributes are correct
  TestValidator.equals(
    "vote content type is post",
    retrievedVote.content_type,
    "post",
  );

  TestValidator.equals(
    "vote content ID matches the post ID",
    retrievedVote.content_id,
    post.id,
  );

  TestValidator.equals(
    "vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );

  TestValidator.predicate(
    "vote has created_at timestamp",
    retrievedVote.created_at !== null && retrievedVote.created_at !== undefined,
  );
}
