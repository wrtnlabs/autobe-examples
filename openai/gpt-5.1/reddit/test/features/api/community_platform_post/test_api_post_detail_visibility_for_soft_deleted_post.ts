import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_detail_visibility_for_soft_deleted_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a community platform member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community where the post will live
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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

  // 3. Create a new post in the community
  const createPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: createPostBody,
    });
  typia.assert(createdPost);

  // Sanity check: created post should be associated with the community and author
  TestValidator.equals(
    "created post community relation persists",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "created post author matches joined member",
    createdPost.author_memberuser_id,
    member.id,
  );

  // Capture original status and deleted_at for later comparison
  const originalStatus: string = createdPost.status;
  const originalDeletedAt = createdPost.deleted_at ?? null;

  // 4. Soft-delete the post via memberUser update API by changing its status
  const softDeletedStatus = "deleted_by_author";

  const updateBody = {
    status: softDeletedStatus,
    is_locked: true,
  } satisfies ICommunityPlatformPost.IUpdate;

  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.update(connection, {
      postId: createdPost.id,
      body: updateBody,
    });
  typia.assert(updatedPost);

  // Validate that status has changed to a deleted-like state and lock flag updated
  TestValidator.notEquals(
    "post status should change after soft-delete update",
    updatedPost.status,
    originalStatus,
  );
  TestValidator.equals(
    "post status reflects soft-deleted marker",
    updatedPost.status,
    softDeletedStatus,
  );
  TestValidator.equals(
    "post becomes locked after soft-delete",
    updatedPost.is_locked,
    true,
  );

  // If backend populates deleted_at on soft-delete, ensure it transitions from null to non-null
  const updatedDeletedAt = updatedPost.deleted_at ?? null;
  if (originalDeletedAt === null && updatedDeletedAt !== null) {
    TestValidator.predicate(
      "deleted_at is set after soft-delete when previously null",
      updatedDeletedAt !== null,
    );
  }

  // 5. Call the public post detail endpoint for the same post id
  const publicPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(publicPost);

  // 6. Ensure that the public representation does not revert to a non-deleted state
  TestValidator.equals(
    "public post detail retains soft-deleted status",
    publicPost.status,
    updatedPost.status,
  );
  TestValidator.equals(
    "public post detail retains lock flag after soft-delete",
    publicPost.is_locked,
    updatedPost.is_locked,
  );

  // When deleted_at is managed by backend, verify it stays consistent too
  TestValidator.equals(
    "public post detail keeps deleted_at in sync with updated post",
    publicPost.deleted_at ?? null,
    updatedPost.deleted_at ?? null,
  );
}
