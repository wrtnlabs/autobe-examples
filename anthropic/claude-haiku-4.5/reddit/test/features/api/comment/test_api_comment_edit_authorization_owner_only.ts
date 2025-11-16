import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate comment editing authorization - only comment authors can edit their
 * own comments.
 *
 * This test verifies that the API properly enforces authorization rules when
 * editing comments. Only the original comment author should be able to edit
 * their comment. Other members attempting to edit a comment they did not create
 * should receive a 403 Forbidden error.
 *
 * Test workflow:
 *
 * 1. Create first member account (will be the comment author)
 * 2. Create second member account (will attempt unauthorized edit)
 * 3. Create administrator account for category creation
 * 4. Create a category for community classification
 * 5. Create a community in that category
 * 6. Create a post in the community
 * 7. Author creates a comment on the post
 * 8. Non-author attempts to edit the comment (should fail with 403)
 * 9. Author successfully edits their own comment
 * 10. Retrieve and verify the edited comment content matches the update
 */
export async function test_api_comment_edit_authorization_owner_only(
  connection: api.IConnection,
) {
  // 1. Create first member account (comment author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: authorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(author);

  // 2. Create second member account (non-author)
  const nonAuthorEmail = typia.random<string & tags.Format<"email">>();
  const nonAuthor: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: nonAuthorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(nonAuthor);

  // 3. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(8),
        password: "AdminPass123!",
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: admin.token.access,
    },
  };

  // 4. Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to author connection for community creation
  const authorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: author.token.access,
    },
  };

  // 5. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      authorConnection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: "Interesting Tech Topic",
          content_text: "This is a discussion about technology",
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 7. Author creates a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(
      authorConnection,
      {
        body: {
          post_id: post.id,
          content: "This is a great post about technology!",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment author matches", comment.creator.id, author.id);

  // Switch to non-author connection
  const nonAuthorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: nonAuthor.token.access,
    },
  };

  // 8. Non-author attempts to edit the comment (should fail with 403)
  await TestValidator.error(
    "non-author should not be able to edit comment",
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        nonAuthorConnection,
        {
          commentId: comment.id,
          body: {
            content: "Unauthorized edit attempt",
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );

  // 9. Author successfully edits their own comment
  const updatedContent =
    "This is a great post about technology! Updated with more details.";
  const editedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(
      authorConnection,
      {
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(editedComment);

  // 10. Verify the edited comment content
  TestValidator.equals(
    "edited comment content matches",
    editedComment.content,
    updatedContent,
  );
  TestValidator.equals(
    "edited comment creator unchanged",
    editedComment.creator.id,
    author.id,
  );
}
