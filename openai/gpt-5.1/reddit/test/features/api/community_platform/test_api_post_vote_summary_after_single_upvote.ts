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

export async function test_api_post_vote_summary_after_single_upvote(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a new community that allows text posts and posting by members
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a text post in the created community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Cast a single upvote on the post from the same member user
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(vote);

  TestValidator.equals(
    "created vote targets the correct post",
    vote.post_id,
    post.id,
  );

  // 5. Retrieve aggregated voting summary for the post
  const summary: ICommunityPlatformPostVoteSummary =
    await api.functional.communityPlatform.memberUser.posts.votes.index(
      connection,
      { postId: post.id },
    );
  typia.assert<ICommunityPlatformPostVoteSummary>(summary);

  // 6. Business assertions on the summary
  TestValidator.equals(
    "summary post_id matches post.id",
    summary.post_id,
    post.id,
  );
  TestValidator.equals(
    "summary upvote_count is 1 after single upvote",
    summary.upvote_count,
    1,
  );
  TestValidator.equals(
    "summary downvote_count is 0 after single upvote",
    summary.downvote_count,
    0,
  );
  TestValidator.equals(
    "summary score is 1 (upvotes - downvotes)",
    summary.score,
    1,
  );
  TestValidator.equals(
    "summary current_member_vote is 'upvote' after upvoting",
    summary.current_member_vote,
    "upvote",
  );

  // 7. Idempotence: call summary endpoint again and ensure stable values
  const summaryAgain: ICommunityPlatformPostVoteSummary =
    await api.functional.communityPlatform.memberUser.posts.votes.index(
      connection,
      { postId: post.id },
    );
  typia.assert<ICommunityPlatformPostVoteSummary>(summaryAgain);

  TestValidator.equals(
    "summary is idempotent: post_id stable",
    summaryAgain.post_id,
    summary.post_id,
  );
  TestValidator.equals(
    "summary is idempotent: upvote_count stable",
    summaryAgain.upvote_count,
    summary.upvote_count,
  );
  TestValidator.equals(
    "summary is idempotent: downvote_count stable",
    summaryAgain.downvote_count,
    summary.downvote_count,
  );
  TestValidator.equals(
    "summary is idempotent: score stable",
    summaryAgain.score,
    summary.score,
  );
  TestValidator.equals(
    "summary is idempotent: current_member_vote stable",
    summaryAgain.current_member_vote,
    summary.current_member_vote,
  );
}
