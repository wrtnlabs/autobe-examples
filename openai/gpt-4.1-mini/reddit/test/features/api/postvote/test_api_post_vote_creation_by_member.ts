import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_post_vote_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a new post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Cast a vote (+1) on the post by the authenticated member
  const postVoteBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value: 1,
  } satisfies IRedditCommunityPostVote.ICreate;
  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: postVoteBody,
      },
    );
  typia.assert(postVote);

  // 5. Validate the post vote response fields
  TestValidator.equals(
    "PostVote member_id matches",
    postVote.member_id,
    member.id,
  );
  TestValidator.equals("PostVote post_id matches", postVote.post_id, post.id);
  TestValidator.equals("PostVote vote_value is 1", postVote.vote_value, 1);
  TestValidator.predicate(
    "PostVote has created_at timestamp",
    typeof postVote.created_at === "string" && postVote.created_at.length > 0,
  );
  TestValidator.predicate(
    "PostVote has updated_at timestamp",
    typeof postVote.updated_at === "string" && postVote.updated_at.length > 0,
  );
}
