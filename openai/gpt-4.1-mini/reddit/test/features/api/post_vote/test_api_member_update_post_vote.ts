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

export async function test_api_member_update_post_vote(
  connection: api.IConnection,
) {
  // Member joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Password123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(6)}`,
          description: "E2E test community",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post
  const postTypeOptions = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypeOptions);
  let postBody: IRedditCommunityPosts.ICreate;
  if (postType === "text") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "text",
      title: RandomGenerator.paragraph({ sentences: 5 }),
      body_text: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditCommunityPosts.ICreate;
  } else if (postType === "link") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "link",
      title: RandomGenerator.paragraph({ sentences: 5 }),
      link_url: "https://example.com/" + RandomGenerator.alphaNumeric(8),
    } satisfies IRedditCommunityPosts.ICreate;
  } else {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "image",
      title: RandomGenerator.paragraph({ sentences: 5 }),
      image_url:
        "https://example.com/images/" +
        RandomGenerator.alphaNumeric(10) +
        ".jpg",
    } satisfies IRedditCommunityPosts.ICreate;
  }

  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // Create post vote
  const initialVote = RandomGenerator.pick([1, 0, -1] as const); // just pick any from allowed
  const voteCreateBody: IRedditCommunityPostVote.ICreate = {
    member_id: member.id,
    post_id: post.id,
    vote_value: initialVote,
  };
  const postVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(postVote);

  TestValidator.equals(
    "post vote matches member",
    postVote.member_id,
    member.id,
  );
  TestValidator.equals("post vote matches post", postVote.post_id, post.id);
  TestValidator.equals(
    "post vote value matches",
    postVote.vote_value,
    initialVote,
  );

  // Update post vote with distinct value
  const otherVoteValues = [1, 0, -1].filter((v) => v !== initialVote);
  const updatedVote = RandomGenerator.pick(otherVoteValues);
  const voteUpdateBody: IRedditCommunityPostVote.IUpdate = {
    vote_value: updatedVote,
  };

  const updatedVoteResult =
    await api.functional.redditCommunity.member.posts.postVotes.updatePostVote(
      connection,
      {
        postId: post.id,
        voteId: postVote.id,
        body: voteUpdateBody,
      },
    );
  typia.assert(updatedVoteResult);

  TestValidator.equals(
    "updated vote id same",
    updatedVoteResult.id,
    postVote.id,
  );
  TestValidator.equals(
    "updated vote member id same",
    updatedVoteResult.member_id,
    member.id,
  );
  TestValidator.equals(
    "updated vote post id same",
    updatedVoteResult.post_id,
    post.id,
  );
  TestValidator.equals(
    "updated vote value updated",
    updatedVoteResult.vote_value,
    updatedVote,
  );
}
