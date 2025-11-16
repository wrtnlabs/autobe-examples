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

export async function test_api_comment_vote_state_multiple_members_and_vote_directions(
  connection: api.IConnection,
) {
  // 1. Register member user A and keep basic identity for commentary purposes.
  const memberAJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinInput,
    });
  typia.assert(memberA);

  // 2. Create a community as member A.
  const communityCreateBody = {
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create membership for member A in that community.
  const membershipABody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipABody,
      },
    );
  typia.assert(membershipA);

  TestValidator.equals(
    "membership A community slug should match community.slug",
    membershipA.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership A member user id should match authorized member A id",
    membershipA.memberUser.id,
    memberA.id,
  );

  // 4. Create a post in the community as member A.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id should equal community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id should equal member A id",
    post.author_memberuser_id,
    memberA.id,
  );

  // 5. Create a top-level comment on that post as member A.
  const commentCreateBody = {
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment.post.id should equal post.id",
    comment.post.id,
    post.id,
  );

  // 6. Member A casts an upvote on the comment.
  const voteUpBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const memberAVoteState: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: voteUpBody,
      },
    );
  typia.assert(memberAVoteState);

  TestValidator.equals(
    "member A vote state comment_id should match comment.id",
    memberAVoteState.comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "member A vote upvotes should be >= 1",
    memberAVoteState.upvotes >= 1,
  );
  TestValidator.predicate(
    "member A vote downvotes should be >= 0",
    memberAVoteState.downvotes >= 0,
  );

  // 7. Register member user B (this overwrites connection Authorization).
  const memberBJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.net`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinInput,
    });
  typia.assert(memberB);

  // 8. Create membership for member B in the same community.
  const membershipBBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBBody,
      },
    );
  typia.assert(membershipB);

  TestValidator.equals(
    "membership B community slug should match community.slug",
    membershipB.community.slug,
    community.slug,
  );

  // 9. Member B casts a downvote on the same comment.
  const voteDownBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const memberBVoteState: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: voteDownBody,
      },
    );
  typia.assert(memberBVoteState);

  TestValidator.equals(
    "member B vote state comment_id should match comment.id",
    memberBVoteState.comment_id,
    comment.id,
  );

  // Validate that aggregates have non-negative counts and score after mixed votes.
  TestValidator.predicate(
    "aggregate upvotes after B vote should be >= 0",
    memberBVoteState.upvotes >= 0,
  );
  TestValidator.predicate(
    "aggregate downvotes after B vote should be >= 1",
    memberBVoteState.downvotes >= 1,
  );

  // 10. As member B, query aggregated vote state through the public index endpoint.
  const aggregatedFromB: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.index(connection, {
      commentId: comment.id as string & tags.Format<"uuid">,
    });
  typia.assert(aggregatedFromB);

  TestValidator.equals(
    "aggregatedFromB comment_id should equal comment.id",
    aggregatedFromB.comment_id,
    comment.id,
  );

  // Ensure aggregates match between the last write response and current read.
  TestValidator.equals(
    "aggregatedFromB upvotes should match memberBVoteState.upvotes",
    aggregatedFromB.upvotes,
    memberBVoteState.upvotes,
  );
  TestValidator.equals(
    "aggregatedFromB downvotes should match memberBVoteState.downvotes",
    aggregatedFromB.downvotes,
    memberBVoteState.downvotes,
  );
  TestValidator.equals(
    "aggregatedFromB score should match memberBVoteState.score",
    aggregatedFromB.score,
    memberBVoteState.score,
  );

  // 12. Unauthenticated view of the same comment's voting state.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const aggregatedFromGuest: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.index(
      unauthenticatedConnection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(aggregatedFromGuest);

  TestValidator.equals(
    "aggregatedFromGuest comment_id should equal comment.id",
    aggregatedFromGuest.comment_id,
    comment.id,
  );

  // Aggregated counts must remain the same between authenticated and guest views.
  TestValidator.equals(
    "guest upvotes should equal authenticated upvotes",
    aggregatedFromGuest.upvotes,
    aggregatedFromB.upvotes,
  );
  TestValidator.equals(
    "guest downvotes should equal authenticated downvotes",
    aggregatedFromGuest.downvotes,
    aggregatedFromB.downvotes,
  );
  TestValidator.equals(
    "guest score should equal authenticated score",
    aggregatedFromGuest.score,
    aggregatedFromB.score,
  );

  // Guest should not have a personal vote; myVote is expected to be null for unauthenticated connections.
  TestValidator.equals(
    "guest myVote should be null (no caller-specific vote)",
    aggregatedFromGuest.myVote,
    null,
  );
}
