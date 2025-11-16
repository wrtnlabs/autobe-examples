import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSummary";

export async function test_api_post_vote_summary_after_vote_toggle(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Keep ip undefined to let server infer it
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);
  typia.assert<IAuthorizationToken>(member.token);

  // 2. Create a community as this member user
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner should match member user",
    community.owner_memberuser_id,
    member.id,
  );

  // 3. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post should belong to created community",
    post.community_id,
    community.id,
  );

  // 4. Cast an upvote on the post
  const upVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const upVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: upVoteBody,
      },
    );
  typia.assert(upVote);

  TestValidator.equals(
    "upvote should target the created post",
    upVote.post_id,
    post.id,
  );

  // 5. Toggle the vote to a downvote on the same post
  const downVoteBody = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const downVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: downVoteBody,
      },
    );
  typia.assert(downVote);

  TestValidator.equals(
    "downvote should keep the same post id",
    downVote.post_id,
    post.id,
  );
  TestValidator.equals(
    "vote record member id should match joined member",
    downVote.memberuser_id,
    member.id,
  );

  // 6. Retrieve vote summary and validate state after toggle to downvote
  const summary: ICommunityPlatformPostVoteSummary =
    await api.functional.communityPlatform.memberUser.posts.votes.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(summary);

  TestValidator.equals(
    "summary post_id should match post.id",
    summary.post_id,
    post.id,
  );

  TestValidator.predicate(
    "upvote_count should be non-negative",
    summary.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote_count should be non-negative",
    summary.downvote_count >= 0,
  );

  TestValidator.equals(
    "score should equal upvote_count - downvote_count",
    summary.score,
    summary.upvote_count - summary.downvote_count,
  );

  TestValidator.equals(
    "current_member_vote should indicate downvote after toggle",
    summary.current_member_vote,
    "downvote",
  );

  // 7. Optional: toggle back to upvote and verify summary updates
  const upVoteAgainBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const upVoteAgain: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: upVoteAgainBody,
      },
    );
  typia.assert(upVoteAgain);

  const summaryAfterToggleBack: ICommunityPlatformPostVoteSummary =
    await api.functional.communityPlatform.memberUser.posts.votes.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(summaryAfterToggleBack);

  TestValidator.equals(
    "summary after toggling back should still target the same post",
    summaryAfterToggleBack.post_id,
    post.id,
  );

  TestValidator.equals(
    "current_member_vote should indicate upvote after toggling back",
    summaryAfterToggleBack.current_member_vote,
    "upvote",
  );

  TestValidator.notEquals(
    "vote summaries before and after toggle-back should differ",
    summaryAfterToggleBack,
    summary,
  );
}
