import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Verify that a member user can erase their own comment vote.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in to gain platformAdmin context.
 * 2. As platformAdmin, create a community visibility level with a unique code and
 *    name.
 * 3. As platformAdmin, create a post type (e.g., text) with a unique code and
 *    descriptive fields.
 * 4. Member user joins (self-registration) obtaining an authenticated memberUser
 *    context.
 * 5. As memberUser, create a community that uses the created visibility level via
 *    its business code.
 * 6. As memberUser, create a post in that community, using the created post type
 *    id and reasonable text content.
 * 7. As memberUser, create a comment under that post.
 * 8. As memberUser, call commentVotes.create to upvote (vote_value = +1) the
 *    created comment.
 * 9. Capture the returned ICommunityPlatformCommentVote.id as commentVoteId and
 *    typia.assert the structure.
 * 10. Call commentVotes.erase with that commentVoteId and ensure it completes
 *     without error.
 * 11. Optionally, call commentVotes.erase again with the same id and use
 *     TestValidator.error to assert that an error is thrown, demonstrating the
 *     vote no longer exists.
 *
 * Constraints and notes:
 *
 * - Use strict typing with the provided DTOs
 *   (ICommunityPlatformMemberuser.IJoinRequest,
 *   ICommunityPlatformPlatformadmin.IJoin, ICommunityPlatformCommunity.ICreate,
 *   ICommunityPlatformPost.ICreate, ICommunityPlatformComment.ICreate,
 *   ICommunityPlatformCommentVote.ICreate, etc.).
 * - Use RandomGenerator and typia.random with appropriate tags/constraints to
 *   generate realistic test data (emails, URIs, UUID references, etc.).
 * - Do not access or manipulate connection.headers directly; rely on auth SDK
 *   helpers which already set Authorization headers on join/login.
 * - Do not call any APIs besides the ones enumerated in the API SDK Functions
 *   list.
 * - For TestValidator.error, ensure async/await usage is correct (await only when
 *   the callback is async).
 */
export async function test_api_comment_vote_erase_success(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to create config master data
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins (self-registration). This also sets Authorization header for memberUser.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.frontend.local/join",
    referrer: "https://app.frontend.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community with the visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Create a comment under that post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
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

  // 8. Create an initial comment vote (+1) as the same member user
  const voteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 9. Erase the comment vote using its id
  await api.functional.communityPlatform.memberUser.commentVotes.erase(
    connection,
    {
      commentVoteId: vote.id,
    },
  );

  // 10. Optionally verify erasing a non-existent vote fails
  await TestValidator.error(
    "erasing already deleted vote should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.commentVotes.erase(
        connection,
        {
          commentVoteId: vote.id,
        },
      );
    },
  );
}
