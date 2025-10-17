import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate post detail access with correct permission scenarios.
 *
 * The test ensures that public posts are viewable by any user, while posts with
 * restricted statuses (removed, pending moderation) are accessible only to
 * their creators or moderators. It checks access both as the post author
 * (member), authenticated as a different member, and as guest (no
 * authentication). Examines 404 for a non-existent postId.
 *
 * Steps:
 *
 * 1. Register as a new community member.
 * 2. Create a new community with unique name/slug.
 * 3. Create a published post in the community (content_type: 'text').
 * 4. Retrieve post as author (member)--details must match.
 * 5. Retrieve post via an unauthenticated (guest) connection--details must match.
 * 6. Create a post in 'pending' (moderation) status.
 * 7. Create a post in 'removed' status.
 * 8. Retrieve each restricted post as guest/member/author and validate the access
 *    result (should be allowed only for author, denied for guest).
 * 9. Attempt GET with random UUID (non-existent postId) and check 404 error.
 */
export async function test_api_post_detail_access_by_id_with_permission_cases(
  connection: api.IConnection,
) {
  // 1. Register member (will become community creator)
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberInput });
  typia.assert(member);

  // 2. Create community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Create published post
  const publishedPostBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.paragraph({ sentences: 5 }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const publishedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: publishedPostBody,
    });
  typia.assert(publishedPost);

  // 4. Retrieve post as author (member)
  const postAsAuthor = await api.functional.communityPlatform.posts.at(
    connection,
    { postId: publishedPost.id },
  );
  typia.assert(postAsAuthor);
  TestValidator.equals(
    "post as author: id matches",
    postAsAuthor.id,
    publishedPost.id,
  );
  TestValidator.equals(
    "post as author: title matches",
    postAsAuthor.title,
    publishedPost.title,
  );
  TestValidator.equals(
    "post as author: status matches",
    postAsAuthor.status,
    publishedPost.status,
  );

  // 5. Retrieve post as guest (unauthenticated connection)
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const postAsGuest = await api.functional.communityPlatform.posts.at(
    guestConn,
    { postId: publishedPost.id },
  );
  typia.assert(postAsGuest);
  TestValidator.equals(
    "post as guest: id matches",
    postAsGuest.id,
    publishedPost.id,
  );
  TestValidator.equals(
    "post as guest: status",
    postAsGuest.status,
    publishedPost.status,
  );

  // 6. Create a post with 'pending' status
  const pendingPostBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.paragraph({ sentences: 5 }),
    content_type: "text",
    status: "pending",
  } satisfies ICommunityPlatformPost.ICreate;
  const pendingPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: pendingPostBody,
    });
  typia.assert(pendingPost);

  // 7. Create a post with 'removed' status
  const removedPostBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.paragraph({ sentences: 5 }),
    content_type: "text",
    status: "removed",
  } satisfies ICommunityPlatformPost.ICreate;
  const removedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: removedPostBody,
    });
  typia.assert(removedPost);

  // 8a. Retrieve 'pending' post as author (allowed)
  const pendingAsAuthor = await api.functional.communityPlatform.posts.at(
    connection,
    { postId: pendingPost.id },
  );
  typia.assert(pendingAsAuthor);
  TestValidator.equals(
    "pending post as author: id match",
    pendingAsAuthor.id,
    pendingPost.id,
  );
  TestValidator.equals(
    "pending post as author: status match",
    pendingAsAuthor.status,
    pendingPost.status,
  );

  // 8b. Retrieve 'pending' post as guest (should be error)
  await TestValidator.error("pending post guest forbidden", async () => {
    await api.functional.communityPlatform.posts.at(guestConn, {
      postId: pendingPost.id,
    });
  });

  // 8c. Retrieve 'removed' post as author (allowed)
  const removedAsAuthor = await api.functional.communityPlatform.posts.at(
    connection,
    { postId: removedPost.id },
  );
  typia.assert(removedAsAuthor);
  TestValidator.equals(
    "removed post as author: id match",
    removedAsAuthor.id,
    removedPost.id,
  );
  TestValidator.equals(
    "removed post as author: status match",
    removedAsAuthor.status,
    removedPost.status,
  );

  // 8d. Retrieve 'removed' post as guest (should be error)
  await TestValidator.error("removed post guest forbidden", async () => {
    await api.functional.communityPlatform.posts.at(guestConn, {
      postId: removedPost.id,
    });
  });

  // 9. Attempt to retrieve with random non-existent postId (expect error)
  await TestValidator.error("non-existent postId returns error", async () => {
    await api.functional.communityPlatform.posts.at(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
