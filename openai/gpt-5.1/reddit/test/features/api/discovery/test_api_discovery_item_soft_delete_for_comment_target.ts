import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_discovery_item_soft_delete_for_comment_target(
  connection: api.IConnection,
) {
  // 1. Register and login as memberUser to get an authenticated member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  const memberLoginBody = {
    identifier: memberJoin.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/signup",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as memberUser
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a membership for that community as the same memberUser
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
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id matches logged-in member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id matches created community",
    post.community_id,
    community.id,
  );

  // 5. Add a top-level comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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
    "comment post summary id matches post id",
    comment.post.id,
    post.id,
  );

  // 6. Establish an adminUser actor (join and then login)
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(8)}`,
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    identifier: adminJoin.email,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 7. As adminUser, create a discovery item targeting the comment
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const discoveryCreateBody = {
    target_type: "comment",
    target_id: comment.id,
    context: "home_feed",
    priority_score: 10,
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const createdDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(createdDiscovery);

  TestValidator.equals(
    "discovery item target_id matches comment id",
    createdDiscovery.target_id,
    comment.id,
  );
  TestValidator.equals(
    "discovery item target_type is comment",
    createdDiscovery.target_type,
    discoveryCreateBody.target_type,
  );

  const beforeDeleteId = createdDiscovery.id;
  const beforeDeleteTargetType = createdDiscovery.target_type;
  const beforeDeleteTargetId = createdDiscovery.target_id;
  const beforeDeleteDeletedAt = createdDiscovery.deleted_at ?? null;

  // 8. Soft delete the discovery item as adminUser
  const erasedDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.erase(
      connection,
      {
        discoveryItemId: createdDiscovery.id,
      },
    );
  typia.assert(erasedDiscovery);

  // 9. Assert soft delete behavior
  TestValidator.equals(
    "discovery item id preserved after soft delete",
    erasedDiscovery.id,
    beforeDeleteId,
  );
  TestValidator.equals(
    "discovery item target_type preserved after soft delete",
    erasedDiscovery.target_type,
    beforeDeleteTargetType,
  );
  TestValidator.equals(
    "discovery item target_id preserved after soft delete",
    erasedDiscovery.target_id,
    beforeDeleteTargetId,
  );

  TestValidator.predicate(
    "discovery item deleted_at populated after soft delete",
    erasedDiscovery.deleted_at !== null &&
      erasedDiscovery.deleted_at !== undefined,
  );

  if (beforeDeleteDeletedAt !== null && beforeDeleteDeletedAt !== undefined) {
    TestValidator.equals(
      "deleted_at should not change from a previously set value",
      erasedDiscovery.deleted_at,
      beforeDeleteDeletedAt,
    );
  }
}
