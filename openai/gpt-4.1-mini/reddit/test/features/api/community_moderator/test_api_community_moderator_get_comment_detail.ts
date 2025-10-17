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

/**
 * Validate comment detail retrieval by a community moderator user.
 *
 * This end-to-end test ensures that a community moderator can authenticate, a
 * member can create a community and a post, then the moderator can add a
 * comment to that post and successfully retrieve detailed information about the
 * comment.
 *
 * The test covers multiple user role authentications (member and community
 * moderator), creation of nested entities (community > post > comment), and
 * validation of the retrieved comment fields.
 *
 * Steps:
 *
 * 1. Community moderator user joins and authenticates.
 * 2. Member user joins and authenticates.
 * 3. Member creates a community.
 * 4. Member creates a post within the community.
 * 5. Community moderator switches session and creates a comment on the post.
 * 6. Community moderator retrieves detailed comment information.
 * 7. Validates comment detail correctness including text, author, timestamps.
 */
export async function test_api_community_moderator_get_comment_detail(
  connection: api.IConnection,
) {
  // 1. Community moderator user joins
  const communityModeratorJoinBody = {
    email: `moderator_${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "Moder@t0rPass",
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: communityModeratorJoinBody },
    );
  typia.assert(communityModerator);

  // 2. Member user joins
  const memberJoinBody = {
    email: `member_${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "M3mb3rPass!",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 3. Member creates a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Member creates a post within the community
  const postType = RandomGenerator.pick(["text", "link", "image"] as const);
  let postBody: IRedditCommunityPosts.ICreate;
  if (postType === "text") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "text",
      title: RandomGenerator.paragraph({
        sentences: 4,
        wordMin: 6,
        wordMax: 10,
      }),
      body_text: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 20,
        wordMin: 3,
        wordMax: 6,
      }),
    } satisfies IRedditCommunityPosts.ICreate;
  } else if (postType === "link") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "link",
      title: RandomGenerator.paragraph({
        sentences: 4,
        wordMin: 6,
        wordMax: 10,
      }),
      link_url: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IRedditCommunityPosts.ICreate;
  } else {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "image",
      title: RandomGenerator.paragraph({
        sentences: 4,
        wordMin: 6,
        wordMax: 10,
      }),
      image_url: `https://example.com/image_${RandomGenerator.alphaNumeric(6)}.png`,
    } satisfies IRedditCommunityPosts.ICreate;
  }
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // 5. Community moderator logs in (if needed or continues authenticated)
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorJoinBody.email,
        password: communityModeratorJoinBody.password,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 6. Community moderator creates a comment on the post
  const commentBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
    author_member_id: communityModerator.id,
    parent_comment_id: null,
    author_guest_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const createdComment: IRedditCommunityComment =
    await api.functional.redditCommunity.communityModerator.posts.comments.create(
      connection,
      { postId: post.id, body: commentBody },
    );
  typia.assert(createdComment);

  // 7. Community moderator retrieves detailed comment information
  const commentDetail: IRedditCommunityComment =
    await api.functional.redditCommunity.communityModerator.posts.comments.at(
      connection,
      { postId: post.id, commentId: createdComment.id },
    );
  typia.assert(commentDetail);

  // 8. Verify comment details
  TestValidator.equals(
    "comment id matches",
    commentDetail.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment post id matches",
    commentDetail.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment body text matches",
    commentDetail.body_text,
    commentBody.body_text,
  );
  TestValidator.equals(
    "comment author member id matches",
    commentDetail.author_member_id,
    communityModerator.id,
  );
  TestValidator.equals(
    "comment parent_comment_id is null",
    commentDetail.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "comment author guest id is null",
    commentDetail.author_guest_id,
    null,
  );
}
