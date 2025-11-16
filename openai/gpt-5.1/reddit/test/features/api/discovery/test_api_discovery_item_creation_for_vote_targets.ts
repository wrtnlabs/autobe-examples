import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * End-to-end validation of discovery item creation for vote-related targets.
 *
 * Business goal This test ensures that an admin user can create discovery items
 * that reference vote-related entities derived from real member activity: a
 * post vote and a comment vote within a community. The flow exercises the full
 * stack from authentication through content creation, voting, and finally
 * admin-driven discovery promotion.
 *
 * Steps
 *
 * 1. Register an admin user (adminUser.join) and keep its credentials for later
 *    login.
 * 2. Register a member user (memberUser.join); the SDK sets the Authorization
 *    header for memberUser.
 * 3. As memberUser, create a community using
 *    communityPlatform.memberUser.communities.create.
 * 4. As memberUser, create a membership for that community so the member has
 *    posting rights using
 *    communityPlatform.memberUser.communities.memberships.create.
 * 5. As memberUser, create a post in that community using
 *    communityPlatform.memberUser.posts.create.
 * 6. As memberUser, create a comment on that post using
 *    communityPlatform.memberUser.posts.comments.create.
 * 7. As memberUser, cast a vote on the post using
 *    communityPlatform.memberUser.posts.votes.create and capture the returned
 *    ICommunityPlatformPostVote.id as the post vote identifier.
 * 8. As memberUser, cast a vote on the comment using
 *    communityPlatform.memberUser.comments.votes.create. The returned
 *    ICommunityPlatformCommentVote is an aggregate view keyed by comment_id,
 *    not a vote row id, so for discovery targeting we will treat the comment
 *    itself as the target entity.
 * 9. Switch to the adminUser actor by logging in via auth.adminUser.login with the
 *    stored admin credentials.
 * 10. As adminUser, create two discovery items via
 *     communityPlatform.adminUser.discovery.items.create:
 *
 *     - One targeting the post vote, with target_type set to a post-vote-appropriate
 *           value (e.g., "post_vote") and target_id equal to the
 *           ICommunityPlatformPostVote.id from step 7.
 *     - One targeting the comment vote context, with target_type set to a
 *           comment-vote-appropriate value (e.g., "comment_vote") and target_id
 *           equal to the comment.id from step 8. In both cases, use a concrete
 *           context string, a positive priority_score, status "active", and
 *           start_at/end_at timestamps ordered such that start_at < end_at.
 * 11. Validate that both discovery item creations succeed, the responses conform to
 *     ICommunityPlatformDiscoveryItem, and that their target_type and target_id
 *     fields correspond to the intended vote-related entities.
 * 12. Since no GET-by-id discovery item endpoint exists in the provided SDK, rely
 *     on the immediate responses for verification instead of performing an
 *     additional retrieval.
 */
export async function test_api_discovery_item_creation_for_vote_targets(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and remember credentials
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassw0rd!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoinOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Register member user (join)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPassw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 3. As member user, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
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

  // 4. As member user, create a membership in the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 5. As member user, create a post
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. As member user, create a comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
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

  // 7. As member user, cast a vote on the post
  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: postVoteCreateBody,
      },
    );
  typia.assert(postVote);

  // 8. As member user, cast a vote on the comment
  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(commentVote);

  // Sanity checks for votes
  TestValidator.equals(
    "post vote should be associated with the correct post",
    postVote.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment vote aggregate should be for the correct comment",
    commentVote.comment_id,
    comment.id,
  );

  // 9. Switch to admin user context via login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 10. As admin user, create discovery items for the vote-related targets
  const now = new Date();
  const startAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const postVoteDiscoveryBody = {
    target_type: "post_vote",
    target_id: postVote.id,
    context: "home_feed",
    priority_score: 10,
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const postVoteDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: postVoteDiscoveryBody,
      },
    );
  typia.assert(postVoteDiscovery);

  const commentVoteDiscoveryBody = {
    target_type: "comment_vote",
    target_id: comment.id,
    context: "home_feed",
    priority_score: 8,
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const commentVoteDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: commentVoteDiscoveryBody,
      },
    );
  typia.assert(commentVoteDiscovery);

  // 11. Validate discovery items target the intended entities
  TestValidator.equals(
    "post-vote discovery item should have correct target_type",
    postVoteDiscovery.target_type,
    postVoteDiscoveryBody.target_type,
  );
  TestValidator.equals(
    "post-vote discovery item should have correct target_id",
    postVoteDiscovery.target_id,
    postVoteDiscoveryBody.target_id,
  );

  TestValidator.equals(
    "comment-vote discovery item should have correct target_type",
    commentVoteDiscovery.target_type,
    commentVoteDiscoveryBody.target_type,
  );
  TestValidator.equals(
    "comment-vote discovery item should have correct target_id",
    commentVoteDiscovery.target_id,
    commentVoteDiscoveryBody.target_id,
  );

  // Additional sanity checks on scheduling and status
  TestValidator.predicate(
    "discovery item start_at should be before end_at",
    new Date(postVoteDiscovery.start_at ?? startAt) <
      new Date(postVoteDiscovery.end_at ?? endAt),
  );
  TestValidator.equals(
    "post-vote discovery item status should be active",
    postVoteDiscovery.status,
    "active",
  );
  TestValidator.equals(
    "comment-vote discovery item status should be active",
    commentVoteDiscovery.status,
    "active",
  );
}
