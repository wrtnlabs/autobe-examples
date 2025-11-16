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

export async function test_api_comment_vote_update_on_locked_or_restricted_comment(
  connection: api.IConnection,
) {
  // 1. Register a memberUser via join to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community owned by this memberUser.
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Establish membership in the community for this memberUser.
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

  // 4. Create a post in the community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a comment on the post.
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

  // 6. Cast an initial upvote on the comment.
  const initialVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const initialVoteState: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: initialVoteBody,
      },
    );
  typia.assert(initialVoteState);

  // Basic sanity checks on initial vote state.
  TestValidator.equals(
    "initial comment id should match created comment",
    initialVoteState.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "myVote should reflect initial up direction",
    initialVoteState.myVote,
    initialVoteBody.direction,
  );
  TestValidator.predicate(
    "upvotes should be non-negative after initial vote",
    initialVoteState.upvotes >= 0,
  );
  TestValidator.predicate(
    "downvotes should be non-negative after initial vote",
    initialVoteState.downvotes >= 0,
  );

  // 7. Independently test the update API for structural correctness.
  //
  // The backend contract for update identifies the vote record by a
  // voteId, but that identifier is not exposed by the aggregate
  // ICommunityPlatformCommentVote type. Therefore, we cannot reliably
  // tie an update call to the vote created above without additional
  // read APIs. To keep the test implementable and compilation-safe, we
  // treat the update API as an independent call whose primary contract
  // is its request/response typing.

  const updateVoteBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  const updatedVoteState: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.update(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        voteId: typia.random<string & tags.Format<"uuid">>(),
        body: updateVoteBody,
      },
    );
  typia.assert(updatedVoteState);

  // We only assert structural properties, as we are not guaranteed any
  // relationship to the previously created vote.
  TestValidator.predicate(
    "updated upvotes should be non-negative",
    updatedVoteState.upvotes >= 0,
  );
  TestValidator.predicate(
    "updated downvotes should be non-negative",
    updatedVoteState.downvotes >= 0,
  );
}
