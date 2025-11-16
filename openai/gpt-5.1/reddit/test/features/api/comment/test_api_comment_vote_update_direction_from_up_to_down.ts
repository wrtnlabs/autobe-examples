import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify updating a comment vote from up to down and aggregate changes.
 *
 * Business workflow:
 *
 * 1. Register a new memberUser (join) to obtain an authenticated context.
 * 2. Create a community owned by this memberUser.
 * 3. Create a membership for the same memberUser in that community.
 * 4. Create a post in the community.
 * 5. Create a top-level comment on the post.
 * 6. Cast an initial upvote on the comment via POST
 *    /communityPlatform/memberUser/comments/{commentId}/votes.
 * 7. Update the vote to "down" via PUT
 *    /communityPlatform/memberUser/comments/{commentId}/votes/{voteId}.
 * 8. Assert that the aggregates and myVote reflect the updated direction and that
 *    they match expectations for a single-vote scenario.
 */
export async function test_api_comment_vote_update_direction_from_up_to_down(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // meets MinLength<8>
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community as this member user
  const communityBody = {
    slug: `test-${RandomGenerator.alphaNumeric(8)}`,
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
    "community owner should be the joined member user",
    community.owner_memberuser_id,
    memberUser.id,
  );

  // 3. Create membership for the same member user in that community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community slug should match",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id should match",
    post.community_id,
    community.id,
  );

  // 5. Create a top-level comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment post id should match",
    comment.post.id,
    post.id,
  );

  // 6. Cast an initial upvote on the comment
  const initialVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const initialVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: initialVoteBody,
      },
    );
  typia.assert(initialVote);

  TestValidator.equals(
    "initial vote comment id should match comment",
    initialVote.comment_id,
    comment.id,
  );

  TestValidator.equals(
    "after initial upvote, upvotes should be 1",
    initialVote.upvotes,
    1,
  );
  TestValidator.equals(
    "after initial upvote, downvotes should be 0",
    initialVote.downvotes,
    0,
  );
  TestValidator.equals(
    "after initial upvote, score should be 1",
    initialVote.score,
    1,
  );
  TestValidator.equals(
    "after initial upvote, myVote should be 'up'",
    initialVote.myVote,
    "up",
  );

  // 7. Update the vote direction to "down" using PUT with a voteId
  const voteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  const updatedVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.update(
      connection,
      {
        commentId: comment.id,
        voteId,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);

  // 8. Assertions after update: myVote is down and aggregates reflect change
  TestValidator.equals(
    "updated vote comment id should still match comment",
    updatedVote.comment_id,
    comment.id,
  );

  TestValidator.equals(
    "after update to down, upvotes should be 0",
    updatedVote.upvotes,
    0,
  );
  TestValidator.equals(
    "after update to down, downvotes should be 1",
    updatedVote.downvotes,
    1,
  );
  TestValidator.equals(
    "after update to down, score should be -1",
    updatedVote.score,
    -1,
  );
  TestValidator.equals(
    "after update to down, myVote should be 'down'",
    updatedVote.myVote,
    "down",
  );
}
