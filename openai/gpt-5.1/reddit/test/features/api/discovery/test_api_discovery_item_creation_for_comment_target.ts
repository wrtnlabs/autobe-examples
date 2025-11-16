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

export async function test_api_discovery_item_creation_for_comment_target(
  connection: api.IConnection,
) {
  // 1. Register memberUser and obtain authenticated context
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // satisfies MinLength<8>
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create community as memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(8),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create membership in that community for the member
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member user id matches authorized member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community_id matches community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id matches memberAuthorized.id",
    post.author_memberuser_id,
    memberAuthorized.id,
  );

  // 5. Create a root-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment post.id matches created post.id",
    comment.post.id,
    post.id,
  );

  // 6. Register adminUser and obtain admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. Create discovery item targeting the comment as adminUser
  const startAt: string & tags.Format<"date-time"> = RandomGenerator.date(
    new Date(),
    0,
  ).toISOString() as string & tags.Format<"date-time">;
  const endAt: string & tags.Format<"date-time"> = RandomGenerator.date(
    new Date(Date.now() + 1_000),
    86_400_000,
  ).toISOString() as string & tags.Format<"date-time">;

  const discoveryContext = "comment_promotion";
  const discoveryPriority = 10;
  const discoveryStatus = "active";

  const discoveryCreateBody = {
    target_type: "comment",
    target_id: comment.id,
    context: discoveryContext,
    priority_score: discoveryPriority,
    start_at: startAt,
    end_at: endAt,
    status: discoveryStatus,
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const discoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert<ICommunityPlatformDiscoveryItem>(discoveryItem);

  // 8. Validate discovery item fields
  TestValidator.equals(
    "discovery item target_type is 'comment'",
    discoveryItem.target_type,
    "comment",
  );
  TestValidator.equals(
    "discovery item target_id matches comment.id",
    discoveryItem.target_id,
    comment.id,
  );
  TestValidator.equals(
    "discovery item context matches input context",
    discoveryItem.context,
    discoveryContext,
  );
  TestValidator.equals(
    "discovery item priority_score matches input priority",
    discoveryItem.priority_score,
    discoveryPriority,
  );
  TestValidator.equals(
    "discovery item status matches input status",
    discoveryItem.status,
    discoveryStatus,
  );

  TestValidator.predicate(
    "discovery item start_at should be defined when provided",
    discoveryItem.start_at !== null && discoveryItem.start_at !== undefined,
  );
  TestValidator.predicate(
    "discovery item end_at should be defined when provided",
    discoveryItem.end_at !== null && discoveryItem.end_at !== undefined,
  );

  if (
    discoveryItem.start_at !== null &&
    discoveryItem.start_at !== undefined &&
    discoveryItem.end_at !== null &&
    discoveryItem.end_at !== undefined
  ) {
    const startTime = new Date(discoveryItem.start_at).getTime();
    const endTime = new Date(discoveryItem.end_at).getTime();

    TestValidator.predicate(
      "discovery item end_at is after start_at",
      endTime > startTime,
    );
  }
}
