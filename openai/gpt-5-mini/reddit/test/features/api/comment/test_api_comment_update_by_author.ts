import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1) Register author (member)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: `P@ssw0rd!${RandomGenerator.alphaNumeric(4)}`,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(author);

  // 2) Create a public community (avoid subscription complexity)
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 4) Create a top-level comment on the post
  const originalComment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(originalComment);

  // Basic sanity checks
  TestValidator.equals(
    "created comment post_id matches post.id",
    originalComment.post_id,
    post.id,
  );
  TestValidator.predicate(
    "created comment has id",
    typeof originalComment.id === "string",
  );

  // 5) Update the comment body as the author
  const newBody = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedComment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: {
          body: newBody,
        } satisfies ICommunityPortalComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Validate updated fields
  TestValidator.equals(
    "updated comment id unchanged",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "updated comment post_id unchanged",
    updatedComment.post_id,
    originalComment.post_id,
  );
  TestValidator.equals(
    "updated comment body matches new content",
    updatedComment.body,
    newBody,
  );
  TestValidator.equals(
    "comment author_user_id matches creator id",
    updatedComment.author_user_id,
    author.id,
  );

  // updated_at should be later than created_at
  const createdAt = Date.parse(originalComment.created_at);
  const updatedAt = Date.parse(updatedComment.updated_at);
  TestValidator.predicate(
    "updated_at is later than created_at",
    updatedAt > createdAt,
  );

  // 6) Idempotence: apply the same update again and ensure stable state
  const reupdatedComment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: {
          body: newBody,
        } satisfies ICommunityPortalComment.IUpdate,
      },
    );
  typia.assert(reupdatedComment);

  TestValidator.equals(
    "reupdate preserves id",
    reupdatedComment.id,
    updatedComment.id,
  );
  TestValidator.equals(
    "reupdate preserves body",
    reupdatedComment.body,
    updatedComment.body,
  );

  const reupdatedAt = Date.parse(reupdatedComment.updated_at);
  TestValidator.predicate(
    "reupdate updated_at does not regress",
    reupdatedAt >= updatedAt,
  );

  // 7) Protected fields must be unchanged
  TestValidator.equals(
    "protected field post_id unchanged after update",
    reupdatedComment.post_id,
    originalComment.post_id,
  );
  TestValidator.equals(
    "protected field parent_comment_id unchanged after update",
    reupdatedComment.parent_comment_id,
    originalComment.parent_comment_id,
  );
  TestValidator.equals(
    "protected field created_at unchanged after update",
    reupdatedComment.created_at,
    originalComment.created_at,
  );
  TestValidator.equals(
    "protected field deleted_at unchanged after update",
    reupdatedComment.deleted_at,
    originalComment.deleted_at,
  );

  // 8) Server enforces max-length (attempt an overly long update and expect error)
  const largeBody = ArrayUtil.repeat(200, () =>
    RandomGenerator.paragraph({ sentences: 20 }),
  ).join("\n\n");
  await TestValidator.error(
    "overly long comment body should be rejected",
    async () => {
      await api.functional.communityPortal.member.posts.comments.update(
        connection,
        {
          postId: post.id,
          commentId: originalComment.id,
          body: {
            body: largeBody,
          } satisfies ICommunityPortalComment.IUpdate,
        },
      );
    },
  );
}
