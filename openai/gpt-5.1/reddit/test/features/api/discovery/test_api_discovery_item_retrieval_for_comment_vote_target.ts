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

export async function test_api_discovery_item_retrieval_for_comment_vote_target(
  connection: api.IConnection,
) {
  // 1. Create an adminUser account (authorized admin context will be needed later)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a memberUser account and obtain authorized member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test.com`,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.test/member/join",
    referrer: "https://client.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. As memberUser, create a membership in that community
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

  // 5. As memberUser, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. As memberUser, create a top-level comment under that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 7. As memberUser, create a vote on that comment
  const voteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(commentVote);

  TestValidator.equals(
    "vote aggregate is for the expected comment",
    commentVote.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "myVote reflects submitted direction",
    commentVote.myVote,
    voteCreateBody.direction,
  );

  // 8. Switch to admin context and create a discovery item targeting the comment vote
  // adminAuthorized already set connection Authorization header via SDK, but to be explicit
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.test/admin/login",
    referrer: "https://client.test/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);
  TestValidator.equals(
    "logged-in admin matches joined admin",
    adminLogin.id,
    adminAuthorized.id,
  );

  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const discoveryCreateBody = {
    target_type: "comment_vote",
    target_id: commentVote.comment_id,
    context: "home_feed_comment_vote",
    priority_score: 0.9,
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const createdDiscoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(createdDiscoveryItem);

  TestValidator.equals(
    "created discovery item target_type matches request",
    createdDiscoveryItem.target_type,
    discoveryCreateBody.target_type,
  );
  TestValidator.equals(
    "created discovery item target_id matches comment vote comment_id",
    createdDiscoveryItem.target_id,
    commentVote.comment_id,
  );

  // 9. Retrieve the discovery item via public discovery endpoint
  const fetchedDiscoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.discovery.items.at(connection, {
      discoveryItemId: createdDiscoveryItem.id,
    });
  typia.assert(fetchedDiscoveryItem);

  // 10. Validate that the fetched discovery item matches the created one
  TestValidator.equals(
    "fetched discovery item id matches created id",
    fetchedDiscoveryItem.id,
    createdDiscoveryItem.id,
  );
  TestValidator.equals(
    "fetched discovery item target_type matches created target_type",
    fetchedDiscoveryItem.target_type,
    createdDiscoveryItem.target_type,
  );
  TestValidator.equals(
    "fetched discovery item target_id matches created target_id",
    fetchedDiscoveryItem.target_id,
    createdDiscoveryItem.target_id,
  );
  TestValidator.equals(
    "fetched discovery item context matches created context",
    fetchedDiscoveryItem.context,
    createdDiscoveryItem.context,
  );
  TestValidator.equals(
    "fetched discovery item priority_score matches created priority_score",
    fetchedDiscoveryItem.priority_score,
    createdDiscoveryItem.priority_score,
  );
  TestValidator.equals(
    "fetched discovery item start_at matches created start_at",
    fetchedDiscoveryItem.start_at,
    createdDiscoveryItem.start_at,
  );
  TestValidator.equals(
    "fetched discovery item end_at matches created end_at",
    fetchedDiscoveryItem.end_at,
    createdDiscoveryItem.end_at,
  );
  TestValidator.equals(
    "fetched discovery item status matches created status",
    fetchedDiscoveryItem.status,
    createdDiscoveryItem.status,
  );

  // Ensure soft deletion did not occur immediately
  TestValidator.equals(
    "created discovery item deleted_at should be null or undefined",
    createdDiscoveryItem.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "fetched discovery item deleted_at should be null or undefined",
    fetchedDiscoveryItem.deleted_at ?? null,
    null,
  );
}
