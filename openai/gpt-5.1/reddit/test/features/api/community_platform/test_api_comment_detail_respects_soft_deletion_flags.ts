import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Verify that comment detail endpoint exposes soft-deletion lifecycle flags.
 *
 * Business flow:
 *
 * 1. Register a platform admin and configure required master data:
 *
 *    - Create a community visibility level.
 *    - Create a post type.
 * 2. Register a member user who will author community content.
 * 3. As the member user, create:
 *
 *    - A community bound to the created visibility level.
 *    - A post in that community bound to the created post type.
 *    - A comment on that post.
 * 4. Soft-delete the comment via the memberUser DELETE endpoint.
 * 5. Fetch the comment via the public GET
 *    /communityPlatform/posts/{postId}/comments/{commentId} endpoint.
 * 6. Validate that:
 *
 *    - The comment is still retrievable and structurally valid.
 *    - Deleted_at is non-null, indicating logical removal.
 *    - The comment id, post summary, and author summary are consistent with the
 *         originally created entities.
 *    - Core lifecycle fields like is_edited and timestamps behave consistently
 *         across deletion.
 */
export async function test_api_comment_detail_respects_soft_deletion_flags(
  connection: api.IConnection,
) {
  // 1. Register platform admin and configure master data (visibility level & post type)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(6)}`,
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

  // 2. Register member user (author of community, post, and comment)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(14),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As member user, create community, post, and comment
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);

  // 4. Soft-delete the comment via memberUser DELETE endpoint
  await api.functional.communityPlatform.memberUser.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: createdComment.id,
    },
  );

  // 5. Fetch the comment via public GET endpoint
  const fetchedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: createdComment.id,
    });
  typia.assert(fetchedComment);

  // 6. Validate lifecycle and identity consistency
  TestValidator.equals(
    "comment id remains stable after soft deletion",
    fetchedComment.id,
    createdComment.id,
  );

  TestValidator.equals(
    "embedded post summary id matches original post id",
    fetchedComment.post.id,
    post.id,
  );

  TestValidator.equals(
    "embedded author summary id matches original comment author",
    fetchedComment.author.id,
    createdComment.author.id,
  );

  TestValidator.predicate(
    "deleted_at is non-null after soft deletion",
    fetchedComment.deleted_at !== null,
  );

  TestValidator.equals(
    "is_edited flag is preserved across soft deletion",
    fetchedComment.is_edited,
    createdComment.is_edited,
  );

  TestValidator.equals(
    "created_at timestamp remains unchanged",
    fetchedComment.created_at,
    createdComment.created_at,
  );
}
