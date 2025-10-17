import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate detailed retrieval of a discussion board post including full
 * content, category, and author metadata.
 *
 * This test executes a full workflow including member authentication, admin
 * authentication, category creation, post creation, and post retrieval without
 * auth.
 *
 * It confirms that:
 *
 * - All properties of the post are correctly returned
 * - The linkage between post and category is accurate
 * - The author ID matches the authenticated member
 * - Proper error responses occur on invalid post ID
 */
export async function test_api_discussion_board_post_retrieval_detailed_view(
  connection: api.IConnection,
) {
  // 1. Admin user creation and login for managing categories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: "AdminUser",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 2. Create discussion board category with admin credentials
  const categoryName = RandomGenerator.pick([
    "Economics",
    "Politics",
    "Science",
    "Technology",
    "Culture",
  ] as const);
  const categoryDescription = `Category for ${categoryName} discussions.`;
  const categoryCreateBody = {
    name: categoryName,
    description: categoryDescription,
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Member user creation and login for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "UserPass123";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: "MemberUser",
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberAuthorized);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 4. Member creates a new discussion board post under the created category
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 7,
  });
  const postStatus = "public";

  const postCreateBody = {
    category_id: category.id,
    title: postTitle,
    body: postBody,
    post_status: postStatus,
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 5. Retrieve the discussion board post by ID without authentication
  // Create a non-authenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedPost: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.discussionBoardPosts.at(
      unauthenticatedConnection,
      {
        discussionBoardPostId: post.id,
      },
    );
  typia.assert(retrievedPost);

  // 6. Validate all post details
  TestValidator.equals("post id matches", retrievedPost.id, post.id);
  TestValidator.equals(
    "post category_id matches",
    retrievedPost.category_id,
    category.id,
  );
  TestValidator.equals(
    "post member_id matches",
    retrievedPost.member_id,
    memberAuthorized.id,
  );
  TestValidator.equals("post title matches", retrievedPost.title, postTitle);
  TestValidator.equals("post body matches", retrievedPost.body, postBody);
  TestValidator.equals(
    "post status matches",
    retrievedPost.post_status,
    postStatus,
  );
  TestValidator.predicate(
    "post timestamps valid",
    !!retrievedPost.created_at && !!retrievedPost.updated_at,
  );
  TestValidator.equals(
    "post deleted_at is null",
    retrievedPost.deleted_at,
    null,
  );

  // 7. Negative tests: invalid post ID should raise error
  await TestValidator.error(
    "retrieve with invalid post ID should fail",
    async () => {
      await api.functional.discussionBoard.discussionBoardPosts.at(
        unauthenticatedConnection,
        {
          discussionBoardPostId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.error(
    "retrieve with empty post ID should fail",
    async () => {
      await api.functional.discussionBoard.discussionBoardPosts.at(
        unauthenticatedConnection,
        {
          discussionBoardPostId: "",
        },
      );
    },
  );
}
