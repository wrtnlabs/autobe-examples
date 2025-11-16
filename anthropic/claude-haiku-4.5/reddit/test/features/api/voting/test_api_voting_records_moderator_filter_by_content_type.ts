import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test moderator's ability to filter voting records by content type (post or
 * comment).
 *
 * This test validates that moderators can successfully retrieve and filter
 * voting records by content type, ensuring the filtering mechanism correctly
 * returns only votes for the specified content type. The test creates both post
 * and comment votes, then verifies that filtering by content_type='post' and
 * content_type='comment' returns the expected subsets of voting records.
 *
 * Workflow:
 *
 * 1. Create moderator account
 * 2. Create member account
 * 3. Create community
 * 4. Create post in community
 * 5. Cast upvote on post (member's perspective)
 * 6. Create second post (representing comment target)
 * 7. Cast upvote on second post (representing comment vote)
 * 8. Switch to moderator context
 * 9. Filter votes by content_type='post' and verify results
 * 10. Filter votes by content_type='comment' and verify results
 * 11. Validate filtering accuracy and completeness
 */
export async function test_api_voting_records_moderator_filter_by_content_type(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "http://localhost:3000/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "MemberPassword123!",
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(15),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Cast upvote on post
  const postVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(postVote);
  TestValidator.equals(
    "post vote content_type is post",
    postVote.content_type,
    "post",
  );

  // 6. Create second post (representing comment target)
  const commentPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(commentPost);

  // 7. Cast upvote on comment (second post as comment)
  const commentVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "comment",
        content_id: commentPost.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(commentVote);
  TestValidator.equals(
    "comment vote content_type is comment",
    commentVote.content_type,
    "comment",
  );

  // 8. Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 9. Filter votes by content_type='post'
  const postVotesPage: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        content_type: "post",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(postVotesPage);
  TestValidator.predicate(
    "post votes page contains data",
    postVotesPage.data.length > 0,
  );

  // Verify all returned votes are of type 'post'
  for (const vote of postVotesPage.data) {
    TestValidator.equals(
      "filtered post vote has correct content_type",
      vote.content_type,
      "post",
    );
  }

  // 10. Filter votes by content_type='comment'
  const commentVotesPage: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        content_type: "comment",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(commentVotesPage);
  TestValidator.predicate(
    "comment votes page contains data",
    commentVotesPage.data.length > 0,
  );

  // Verify all returned votes are of type 'comment'
  for (const vote of commentVotesPage.data) {
    TestValidator.equals(
      "filtered comment vote has correct content_type",
      vote.content_type,
      "comment",
    );
  }

  // 11. Verify that post and comment votes are different
  TestValidator.predicate(
    "post votes and comment votes have different content_type values",
    () => {
      const postContainsComments = postVotesPage.data.some(
        (v) => v.content_type === "comment",
      );
      const commentContainsPost = commentVotesPage.data.some(
        (v) => v.content_type === "post",
      );
      return !postContainsComments && !commentContainsPost;
    },
  );

  // 12. Query without content_type filter to get all votes
  const allVotesPage: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesPage);

  // Verify that unfiltered results contain both post and comment votes
  const hasPostVotes = allVotesPage.data.some((v) => v.content_type === "post");
  const hasCommentVotes = allVotesPage.data.some(
    (v) => v.content_type === "comment",
  );
  TestValidator.predicate(
    "unfiltered votes contain both post and comment types",
    hasPostVotes && hasCommentVotes,
  );

  // Final validation: verify filtering reduces the result set appropriately
  TestValidator.predicate(
    "filtered results are subsets of unfiltered results",
    postVotesPage.data.length + commentVotesPage.data.length <=
      allVotesPage.data.length,
  );
}
