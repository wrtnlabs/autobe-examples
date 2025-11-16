import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_update_lock_thread_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user who will act as community owner / moderator
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community owned by this member user
  const communityBody = {
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
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership for this user in the community with moderator role
  const membershipBody = {
    role: "moderator",
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in the community
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
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create an initial top-level comment on the post and verify is_locked is false
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const initialComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(initialComment);

  TestValidator.predicate(
    "newly created comment should be unlocked by default",
    initialComment.is_locked === false,
  );

  const originalBody = initialComment.body;
  const originalStatus = initialComment.status;
  const originalUpdatedAt = initialComment.updated_at;

  // 6. Update the comment to lock the thread while keeping body and status unchanged
  const updateBody = {
    is_locked: true,
  } satisfies ICommunityPlatformComment.IUpdate;

  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: initialComment.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(updatedComment);

  // 7. Validate post-conditions: is_locked true, body & status unchanged, updated_at advanced
  TestValidator.predicate(
    "comment should be locked after update",
    updatedComment.is_locked === true,
  );

  TestValidator.equals(
    "comment body must remain unchanged when only is_locked is toggled",
    updatedComment.body,
    originalBody,
  );

  TestValidator.equals(
    "comment status must remain unchanged when only is_locked is toggled",
    updatedComment.status,
    originalStatus,
  );

  TestValidator.predicate(
    "updated_at must be advanced after locking the comment",
    new Date(updatedComment.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
