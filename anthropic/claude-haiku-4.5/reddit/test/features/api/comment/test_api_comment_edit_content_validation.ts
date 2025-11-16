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

export async function test_api_comment_edit_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a category as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Switch back to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create a comment
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);
  const originalContent = comment.content;

  // Step 6: Test editing with empty content - should fail
  await TestValidator.error(
    "should reject empty content when editing comment",
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        connection,
        {
          commentId: comment.id,
          body: {
            content: "",
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );

  // Verify original content is unchanged after failed edit
  const afterFirstFailedEdit: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {} satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(afterFirstFailedEdit);

  // Step 7: Test editing with whitespace-only content
  await TestValidator.error(
    "should reject whitespace-only content when editing comment",
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        connection,
        {
          commentId: comment.id,
          body: {
            content: "   \n\t  ",
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );

  // Verify original content is unchanged after failed edit
  const afterSecondFailedEdit: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {} satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(afterSecondFailedEdit);

  // Step 8: Test editing with content exceeding 10,000 characters
  const oversizedContent = "x".repeat(10001);
  await TestValidator.error(
    "should reject content exceeding 10,000 characters",
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        connection,
        {
          commentId: comment.id,
          body: {
            content: oversizedContent,
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );

  // Verify original content is unchanged after failed edit
  const afterThirdFailedEdit: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {} satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(afterThirdFailedEdit);
  TestValidator.equals(
    "original comment content remains unchanged after failed edits",
    afterThirdFailedEdit.content,
    originalContent,
  );

  // Step 9: Verify valid edit succeeds
  const validEditContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        content: validEditContent,
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment content was successfully updated with valid content",
    updatedComment.content,
    validEditContent,
  );
  TestValidator.notEquals(
    "updated comment differs from original",
    updatedComment.content,
    originalContent,
  );
}
