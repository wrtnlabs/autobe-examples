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

/**
 * Validate that a member user can update the text of their own comment on a
 * post within a community they are a member of.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a new member user.
 * 2. Create a community owned by that member user with explicit posting flags.
 * 3. Create a membership for the same user in that community.
 * 4. Create a text post in the community.
 * 5. Create a top-level comment on that post as the same user.
 * 6. Update the comment's body text via the comment update endpoint.
 * 7. Assert that ownership and relations remain intact and the body and updated_at
 *    fields reflect the update while created_at is unchanged.
 */
export async function test_api_comment_update_by_author_in_own_community_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
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
  typia.assert(authorized);

  // 2. Create a community
  const communitySlug = `test-${RandomGenerator.alphaNumeric(8)}`;
  const communityBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
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

  // 3. Create a membership for the same member user in the community
  const membershipBody = {
    role: "member",
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

  // 4. Create a text post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
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
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a top-level comment on the post
  const createCommentBody = {
    content: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: createCommentBody,
      },
    );
  typia.assert(createdComment);

  // 6. Update the comment's body text only
  const newBodyText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const updateBody = {
    body: newBodyText,
  } satisfies ICommunityPlatformComment.IUpdate;

  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: createdComment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);

  // 7. Business assertions
  TestValidator.equals(
    "updated comment id should match original comment id",
    updatedComment.id,
    createdComment.id,
  );

  TestValidator.equals(
    "updated comment should still belong to the same post",
    updatedComment.post.id,
    post.id,
  );

  TestValidator.equals(
    "updated comment author should match the authorized member user",
    updatedComment.author.id,
    authorized.id,
  );

  TestValidator.equals(
    "updated comment body should reflect the new text",
    updatedComment.body,
    newBodyText,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedComment.created_at,
    createdComment.created_at,
  );

  TestValidator.notEquals(
    "updated_at should change after comment update",
    updatedComment.updated_at,
    createdComment.updated_at,
  );
}
