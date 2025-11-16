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
 * Validate that creating comments on posts enforces the maximum content length.
 *
 * Business workflow covered:
 *
 * 1. Register a new memberUser (join) to obtain an authenticated context.
 * 2. Create a community as that memberUser.
 * 3. Join the created community (membership creation) for that memberUser.
 * 4. Create a post inside the community.
 * 5. Create a comment whose content length is exactly at the maximum (10,000) and
 *    verify success.
 * 6. Attempt to create a second comment with content length exceeding the maximum
 *    and verify that it is rejected.
 *
 * Validation focus:
 *
 * - Boundary-length comments (exactly 10,000 characters) are accepted.
 * - Oversized comments (> 10,000 characters) are rejected via validation error.
 * - No assumptions about exact HTTP status codes or error payloads; only that an
 *   error is thrown for the oversized request.
 */
export async function test_api_comment_creation_validates_maximum_length(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community for this member user.
  const communitySlug = RandomGenerator.alphaNumeric(12);

  const communityBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a community membership for the memberUser.
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

  // 4. Create a post under the created community.
  const postBody = {
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
      body: postBody,
    });
  typia.assert(post);

  // Helper to generate a string of a specific length using alphabets.
  const generateFixedLengthString = (length: number): string => {
    const chunkSize = 50;
    const chunks = ArrayUtil.repeat(Math.ceil(length / chunkSize), () =>
      RandomGenerator.alphabets(chunkSize),
    );
    const combined = chunks.join("");
    return combined.slice(0, length);
  };

  const maxLength = 10000;

  // 5. Create a comment with content length exactly at the maximum.
  const boundaryContent = generateFixedLengthString(maxLength);
  TestValidator.equals(
    "boundary comment content has expected length",
    boundaryContent.length,
    maxLength,
  );

  const boundaryCommentBody = {
    content: boundaryContent,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const boundaryComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: boundaryCommentBody,
      },
    );
  typia.assert(boundaryComment);

  TestValidator.equals(
    "created boundary-length comment body matches input content",
    boundaryComment.body,
    boundaryContent,
  );

  // 6. Attempt to create a comment with content length exceeding the maximum.
  const oversizedContent = generateFixedLengthString(maxLength + 1);
  TestValidator.equals(
    "oversized comment content has expected length",
    oversizedContent.length,
    maxLength + 1,
  );

  const oversizedCommentBody = {
    content: oversizedContent,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  await TestValidator.error(
    "oversized comment creation should fail validation",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: oversizedCommentBody,
        },
      );
    },
  );
}
